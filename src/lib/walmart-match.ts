import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// A single product scraped off a Walmart.ca search results page
export type WalmartCandidate = {
  title: string;
  url: string;
  price: number | null;
  // Comparison price as shown by Walmart, e.g. 1.09 per "100g"
  unitPrice: number | null;
  unitMeasure: string;
  // Pack size derived from price ÷ unit price — approximate, prefixed "~"
  size: string;
  outOfStock: boolean;
};

// One shopping-list item plus the products the extension found for it
export type MatchRequest = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  candidates: WalmartCandidate[];
};

export type MatchResult = {
  id: string;
  walmartUrl: string | null;
  walmartUrlBackup: string | null;
  reason: string;
};

const PicksSchema = z.object({
  picks: z.array(
    z.object({
      id: z.string(),
      // Index into that item's candidate list; -1 when nothing is a real match
      bestIndex: z.number(),
      // Second choice, used automatically when the best pick is out of stock
      backupIndex: z.number(),
      reason: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `You match grocery shopping-list entries to real Walmart.ca products.

For each list item you get the ingredient name, the quantity needed, and a numbered list of candidate products scraped from Walmart.ca search.

Pick the best candidate using this priority:
1. It must actually BE the ingredient. A recipe calling for "butter" must not match "peanut butter", "butter chicken sauce", or "butter lettuce". Reject near-misses outright.
2. Prefer the plain, standard grocery version over flavoured, organic, premium, or bulk-catering variants unless the item name explicitly asks for it.
3. Size the purchase to the quantity needed. Pack sizes are given as approximations derived from the unit price, so treat them as close-but-not-exact. Pick the smallest pack that still covers what the recipe needs — buying a catering tub to cover 2 tbsp is a bad match even if it is cheaper per unit.
4. Once two candidates are both correct and both adequately sized, use the unit price ($ per 100g / 100ml / kg / L) rather than the sticker price to decide which is better value. A cheaper sticker price on a much smaller pack is usually the worse buy. Never let unit price override rule 1 or rule 3 — the right product in a sensible size beats the cheapest per gram.
5. Prefer in-stock items. Only pick an out-of-stock candidate if it is the sole genuine match.

Also pick a backup: a different candidate that is still a valid match for the same ingredient, used automatically if the best pick is out of stock. The backup must not be the same index as the best pick.

Set bestIndex to -1 if no candidate is genuinely the ingredient — a wrong product in the cart is much worse than a missing one. Set backupIndex to -1 when there is no acceptable second choice.

Return one entry for every item id you were given.`;

function formatItem(item: MatchRequest): string {
  const qty = item.qty ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}` : "";
  const lines = item.candidates.map((c, i) => {
    const price = c.price != null ? `$${c.price.toFixed(2)}` : "price unknown";
    const stock = c.outOfStock ? "OUT OF STOCK" : "in stock";
    const size = c.size ? ` — approx pack size ${c.size}` : "";
    const unit =
      c.unitPrice != null && c.unitMeasure
        ? ` — $${c.unitPrice.toFixed(2)}/${c.unitMeasure}`
        : "";
    return `  [${i}] ${c.title}${size} — ${price}${unit} — ${stock}`;
  });

  return `Item id: ${item.id}
Ingredient: ${item.name}${qty ? `\nQuantity needed: ${qty}` : ""}
Candidates:
${lines.join("\n")}`;
}

/**
 * Ask Claude to pick the best (and backup) Walmart product for each list item.
 * All items go in a single request — it is cheaper than one call per item and
 * lets the model stay consistent across the whole list.
 */
export async function matchWalmartProducts(
  items: MatchRequest[]
): Promise<MatchResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — cannot auto-match items");
  }

  const withCandidates = items.filter((i) => i.candidates.length > 0);
  if (withCandidates.length === 0) return [];

  const client = new Anthropic({ apiKey });

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Match each of these ${withCandidates.length} shopping-list items to a Walmart.ca product.\n\n${withCandidates
          .map(formatItem)
          .join("\n\n")}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(PicksSchema),
    },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Claude returned no parseable match result");
  }

  const byId = new Map(withCandidates.map((i) => [i.id, i]));
  const results: MatchResult[] = [];

  for (const pick of parsed.picks) {
    const item = byId.get(pick.id);
    if (!item) continue; // model invented an id — ignore it

    const pickUrl = (index: number): string | null => {
      if (index < 0 || index >= item.candidates.length) return null;
      return item.candidates[index].url;
    };

    const best = pickUrl(pick.bestIndex);
    const backup =
      pick.backupIndex === pick.bestIndex ? null : pickUrl(pick.backupIndex);

    results.push({
      id: pick.id,
      walmartUrl: best,
      walmartUrlBackup: best ? backup : null,
      reason: pick.reason,
    });
  }

  return results;
}
