import { prisma } from "@/lib/prisma";
import type { RecipeIngredient } from "@/types";

/**
 * Normalise an ingredient name to the key used for aggregation, pantry
 * matching, and exclusions. Kept in one place so the shopping list and the
 * cart queue can never disagree about what counts as "the same item".
 */
export function ingredientKey(name: string): string {
  return name.toLowerCase().trim();
}

/** Strip the generic unit words that recipe imports leave behind. */
export function cleanIngredient(ing: RecipeIngredient): {
  name: string;
  unit: string;
} {
  const junkUnits = /^(units?|count|pieces?|items?|servings?|unit\(s\))$/i;

  let name = ing.name
    .replace(/^\s*\d+\s*(units?|unit\(s\)|pieces?|counts?)\s+/i, "")
    .trim();
  name = name.replace(/\s*,?\s*unit\(s\)\s*/gi, "").trim();

  const unit = junkUnits.test(ing.unit?.trim() ?? "") ? "" : (ing.unit ?? "");

  return { name, unit };
}

/**
 * Ingredient keys the user has cleared off the list for this meal plan.
 * Both the shopping list and the cart queue must consult this — an item the
 * user cleared must not reappear in their Walmart cart.
 */
export async function getExcludedKeys(
  userId: string,
  mealPlanId: string | null
): Promise<Set<string>> {
  if (!mealPlanId) return new Set();

  const rows = await prisma.shoppingListExclusion.findMany({
    where: { userId, mealPlanId },
    select: { nameKey: true },
  });

  return new Set(rows.map((r) => r.nameKey));
}
