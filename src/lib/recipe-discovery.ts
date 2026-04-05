import Anthropic from "@anthropic-ai/sdk";

interface DiscoveredRecipe {
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  ingredients: { name: string; qty: number | null; unit: string }[];
  steps: string[];
  tags: string[];
  mealTypes: string[];
  source: "spoonacular" | "ai";
}

// ── Spoonacular ──

interface SpoonacularResult {
  id: number;
  title: string;
  image: string;
  sourceUrl: string;
  readyInMinutes: number;
  servings: number;
  nutrition?: {
    nutrients: { name: string; amount: number }[];
  };
  extendedIngredients?: {
    name: string;
    amount: number;
    unit: string;
  }[];
  analyzedInstructions?: {
    steps: { step: string }[];
  }[];
  dishTypes?: string[];
}

export async function searchSpoonacular(
  query: string,
  mealType?: string,
  count: number = 6,
  offset: number = 0
): Promise<DiscoveredRecipe[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query,
    number: String(count),
    offset: String(offset),
    addRecipeNutrition: "true",
    fillIngredients: "true",
    addRecipeInstructions: "true",
    apiKey,
  });

  if (mealType && mealType !== "any") {
    params.set("type", mealType);
  }

  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params}`
    );

    if (res.status === 402 || res.status === 429) {
      // Rate limited
      return [];
    }

    if (!res.ok) return [];

    const data = await res.json();
    const results: SpoonacularResult[] = data.results ?? [];

    return results.map((r) => {
      const nutrients = r.nutrition?.nutrients ?? [];
      const findNutrient = (name: string) =>
        nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())
          ?.amount;

      const dishTypes = r.dishTypes ?? [];
      const mealTypes: string[] = [];
      if (dishTypes.some((d) => /breakfast|brunch|morning/i.test(d)))
        mealTypes.push("breakfast");
      if (dishTypes.some((d) => /lunch/i.test(d))) mealTypes.push("lunch");
      if (
        dishTypes.some((d) => /dinner|main.course|main.dish/i.test(d)) ||
        mealTypes.length === 0
      )
        mealTypes.push("dinner");
      if (dishTypes.some((d) => /snack|appetizer/i.test(d)))
        mealTypes.push("snack");

      const steps =
        r.analyzedInstructions?.[0]?.steps?.map((s) => s.step) ?? [];

      return {
        title: r.title,
        description: "",
        imageUrl: r.image,
        sourceUrl: r.sourceUrl,
        prepMinutes: 0,
        cookMinutes: r.readyInMinutes,
        totalMinutes: r.readyInMinutes,
        servings: r.servings,
        calories: findNutrient("calories")
          ? Math.round(findNutrient("calories")!)
          : undefined,
        proteinG: findNutrient("protein")
          ? Math.round(findNutrient("protein")!)
          : undefined,
        carbsG: findNutrient("carbohydrates")
          ? Math.round(findNutrient("carbohydrates")!)
          : undefined,
        fatG: findNutrient("fat")
          ? Math.round(findNutrient("fat")!)
          : undefined,
        ingredients: (r.extendedIngredients ?? []).map((i) => ({
          name: i.name,
          qty: i.amount,
          unit: i.unit,
        })),
        steps,
        tags: dishTypes.slice(0, 4),
        mealTypes,
        source: "spoonacular" as const,
      };
    });
  } catch {
    return [];
  }
}

// ── AI Recipe Generation ──

export async function generateAIRecipes(
  preferences: {
    eatingStyle?: string;
    dislikes?: string[];
    allergies?: string[];
    dietaryNeeds?: string[];
    householdSize?: number;
  },
  mealType: string,
  count: number = 4,
  offset: number = 0
): Promise<DiscoveredRecipe[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });

  const dislikesStr =
    preferences.dislikes?.length
      ? `Avoid these foods: ${preferences.dislikes.join(", ")}.`
      : "";
  const allergiesStr =
    preferences.allergies?.length
      ? `STRICT allergies (never include): ${preferences.allergies.join(", ")}.`
      : "";
  const dietaryStr =
    preferences.dietaryNeeds?.length
      ? `Dietary needs: ${preferences.dietaryNeeds.join(", ")}.`
      : "";

  const batchLabel = offset > 0 ? ` (batch ${Math.floor(offset / 10) + 1} — give completely different recipes than you would normally suggest, get creative)` : "";

  const prompt = `Generate ${count} unique, practical ${mealType} recipes for a household of ${preferences.householdSize ?? 4} people.${batchLabel}

Eating style: ${preferences.eatingStyle ?? "balanced"}
${dislikesStr}
${allergiesStr}
${dietaryStr}

Requirements:
- Real, tested-style recipes that taste good — not generic filler
- Include specific measurements and clear steps
- Recipes should be practical for a busy family
- Mix of quick meals and more involved ones
- Canadian grocery availability (Walmart, Superstore, etc.)

Return ONLY valid JSON array with no markdown. Each recipe object:
{
  "title": "Recipe Name",
  "description": "One-line description",
  "prepMinutes": 10,
  "cookMinutes": 25,
  "servings": 4,
  "calories": 450,
  "proteinG": 30,
  "carbsG": 40,
  "fatG": 15,
  "ingredients": [{"name": "chicken breast", "qty": 2, "unit": "lb"}],
  "steps": ["Step 1 text", "Step 2 text"],
  "tags": ["easy", "one-pot"],
  "mealTypes": ["${mealType}"]
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const recipes = JSON.parse(jsonMatch[0]);

    return recipes.map(
      (r: {
        title: string;
        description?: string;
        prepMinutes?: number;
        cookMinutes?: number;
        servings?: number;
        calories?: number;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        ingredients?: { name: string; qty: number | null; unit: string }[];
        steps?: string[];
        tags?: string[];
        mealTypes?: string[];
      }) => ({
        title: r.title,
        description: r.description ?? "",
        imageUrl: undefined,
        sourceUrl: undefined,
        prepMinutes: r.prepMinutes ?? 0,
        cookMinutes: r.cookMinutes ?? 0,
        totalMinutes: (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
        servings: r.servings ?? 4,
        calories: r.calories,
        proteinG: r.proteinG,
        carbsG: r.carbsG,
        fatG: r.fatG,
        ingredients: r.ingredients ?? [],
        steps: r.steps ?? [],
        tags: r.tags ?? [],
        mealTypes: r.mealTypes ?? [mealType],
        source: "ai" as const,
      })
    );
  } catch {
    return [];
  }
}
