import * as cheerio from "cheerio";
import type { ScrapedRecipe, RecipeIngredient } from "@/types";

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MealPlanStan/1.0; recipe-scraper)",
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Try JSON-LD first
  const jsonLd = extractJsonLd($);
  if (jsonLd) return normalizeJsonLd(jsonLd, url);

  // Heuristic fallback
  return heuristicScrape($, url);
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const text = $(scripts[i]).html();
      if (!text) continue;
      const data = JSON.parse(text);

      // Could be an array or an object with @graph
      const candidates = Array.isArray(data)
        ? data
        : data["@graph"]
          ? data["@graph"]
          : [data];

      for (const item of candidates) {
        if (
          item["@type"] === "Recipe" ||
          (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        ) {
          return item;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeJsonLd(
  data: Record<string, unknown>,
  sourceUrl: string
): ScrapedRecipe {
  const ingredients = parseIngredientsList(
    (data.recipeIngredient as string[]) ?? []
  );

  const steps = parseSteps(data.recipeInstructions);

  const nutrition = data.nutrition as Record<string, string> | undefined;

  return {
    title: String(data.name ?? "Untitled Recipe"),
    sourceUrl,
    imageUrl: extractImage(data.image),
    prepMinutes: parseDuration(data.prepTime as string),
    cookMinutes: parseDuration(data.cookTime as string),
    totalMinutes: parseDuration(data.totalTime as string),
    servings: parseServings(data.recipeYield),
    calories: parseNutritionValue(nutrition?.calories),
    proteinG: parseNutritionValue(nutrition?.proteinContent),
    carbsG: parseNutritionValue(nutrition?.carbohydrateContent),
    fatG: parseNutritionValue(nutrition?.fatContent),
    ingredients,
    steps,
    tags: parseTags(data),
  };
}

function heuristicScrape(
  $: cheerio.CheerioAPI,
  sourceUrl: string
): ScrapedRecipe {
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    "Untitled Recipe";

  const imageUrl =
    $('meta[property="og:image"]').attr("content") ??
    $("article img").first().attr("src");

  // Try to find ingredients
  const ingredientTexts: string[] = [];
  $(
    '[class*="ingredient"] li, [id*="ingredient"] li, [data-testid*="ingredient"]'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text) ingredientTexts.push(text);
  });

  // Try to find steps
  const stepTexts: string[] = [];
  $(
    '[class*="instruction"] li, [class*="direction"] li, [class*="step"] li, [id*="instruction"] li'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text) stepTexts.push(text);
  });

  return {
    title,
    sourceUrl,
    imageUrl,
    prepMinutes: 0,
    cookMinutes: 0,
    totalMinutes: 0,
    servings: 4,
    ingredients: parseIngredientsList(ingredientTexts),
    steps: stepTexts,
    tags: [],
  };
}

function parseIngredientsList(items: string[]): RecipeIngredient[] {
  return items.map((raw) => {
    const text = stripHtml(raw);
    // Simple parse: try to extract qty and unit from the beginning
    const match = text.match(
      /^([\d./½⅓⅔¼¾⅛]+(?:\s*[-–]\s*[\d./]+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|kg|ml|l|cloves?|cans?|pieces?|slices?|stalks?)?\s*(.+)/i
    );

    if (match) {
      return {
        qty: parseFraction(match[1]),
        unit: match[2]?.toLowerCase() ?? "",
        name: match[3].trim(),
      };
    }

    return { qty: null, unit: "", name: text };
  });
}

function parseFraction(str: string): number | null {
  if (!str) return null;
  // Handle unicode fractions
  const unicodeFractions: Record<string, number> = {
    "½": 0.5,
    "⅓": 0.333,
    "⅔": 0.667,
    "¼": 0.25,
    "¾": 0.75,
    "⅛": 0.125,
  };
  let s = str.trim();
  for (const [char, val] of Object.entries(unicodeFractions)) {
    s = s.replace(char, String(val));
  }

  // Handle "1/2" style fractions
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 2) {
      return Number(parts[0]) / Number(parts[1]);
    }
  }

  // Handle "1 0.5" (1 and a half)
  const parts = s.split(/\s+/);
  if (parts.length === 2) {
    return Number(parts[0]) + Number(parts[1]);
  }

  const num = Number(s);
  return isNaN(num) ? null : num;
}

function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? "0") * 60) + parseInt(match[2] ?? "0");
}

function parseServings(
  yield_: unknown
): number {
  if (!yield_) return 4;
  if (typeof yield_ === "number") return yield_;
  const str = Array.isArray(yield_) ? yield_[0] : String(yield_);
  const match = String(str).match(/(\d+)/);
  return match ? parseInt(match[1]) : 4;
}

function extractImage(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return image[0];
  if (typeof image === "object" && image !== null && "url" in image) {
    return (image as { url: string }).url;
  }
  return undefined;
}

function parseNutritionValue(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const match = String(val).match(/([\d.]+)/);
  return match ? Math.round(Number(match[1])) : undefined;
}

function parseSteps(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === "string") {
    return splitHtmlSteps(instructions);
  }
  if (Array.isArray(instructions)) {
    return instructions.flatMap((item) => {
      if (typeof item === "string") return splitHtmlSteps(item);
      if (item.text) return splitHtmlSteps(item.text);
      if (item.itemListElement) {
        return (item.itemListElement as Array<{ text: string }>).flatMap(
          (sub) => splitHtmlSteps(sub.text)
        );
      }
      return [];
    });
  }
  return [];
}

function stripHtml(text: string): string {
  return text
    .replace(/<\/li>\s*<li>/gi, ". ")
    .replace(/<ul>\s*/gi, "")
    .replace(/<\/ul>\s*/gi, "")
    .replace(/<ol>\s*/gi, "")
    .replace(/<\/ol>\s*/gi, "")
    .replace(/<li>\s*/gi, "")
    .replace(/<\/li>\s*/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHtmlSteps(text: string): string[] {
  if (/<li>/i.test(text)) {
    return text
      .split(/<\/li>\s*<li>/i)
      .map((s) => stripHtml(s))
      .filter((s) => s.length > 0);
  }
  const cleaned = stripHtml(text);
  return cleaned ? [cleaned] : [];
}

function parseTags(data: Record<string, unknown>): string[] {
  const tags: string[] = [];
  if (data.recipeCategory) {
    const cats = Array.isArray(data.recipeCategory)
      ? data.recipeCategory
      : [data.recipeCategory];
    tags.push(...cats.map((c) => String(c).toLowerCase()));
  }
  if (data.recipeCuisine) {
    const cuisines = Array.isArray(data.recipeCuisine)
      ? data.recipeCuisine
      : [data.recipeCuisine];
    tags.push(...cuisines.map((c) => String(c).toLowerCase()));
  }
  if (data.keywords) {
    const kws =
      typeof data.keywords === "string"
        ? data.keywords.split(",")
        : Array.isArray(data.keywords)
          ? data.keywords
          : [];
    tags.push(
      ...kws.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean)
    );
  }
  return [...new Set(tags)];
}
