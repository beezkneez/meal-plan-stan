import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";

function stripHtml(text: string): string {
  return text
    .replace(/<\/li>\s*<li>/gi, ". ") // convert list items to sentences
    .replace(/<ul>\s*/gi, "")
    .replace(/<\/ul>\s*/gi, "")
    .replace(/<ol>\s*/gi, "")
    .replace(/<\/ol>\s*/gi, "")
    .replace(/<li>\s*/gi, "")
    .replace(/<\/li>\s*/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "") // remove any remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\*\*/g, "") // remove markdown bold
    .replace(/\s+/g, " ")
    .trim();
}

// POST: clean up all existing recipes - strip HTML from ingredients and steps
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const recipes = await prisma.recipe.findMany({
    where: { userId },
  });

  let cleaned = 0;

  for (const recipe of recipes) {
    const ingredients = JSON.parse(recipe.ingredients);
    const steps: string[] = JSON.parse(recipe.steps);

    // Clean ingredients
    const cleanIngredients = ingredients.map((ing: { name: string; qty: number | null; unit: string; section?: string }) => ({
      ...ing,
      name: stripHtml(ing.name),
      unit: stripHtml(ing.unit),
      section: ing.section ? stripHtml(ing.section) : undefined,
    }));

    // Clean steps - split out <li> items within each step
    const cleanSteps: string[] = [];
    for (const step of steps) {
      if (/<li>/i.test(step)) {
        // Extract individual steps from HTML list
        const items = step
          .split(/<\/li>\s*<li>/i)
          .map((s) => stripHtml(s))
          .filter((s) => s.length > 0);
        cleanSteps.push(...items);
      } else {
        const cleaned = stripHtml(step);
        if (cleaned) cleanSteps.push(cleaned);
      }
    }

    const hasChanges =
      JSON.stringify(cleanIngredients) !== recipe.ingredients ||
      JSON.stringify(cleanSteps) !== JSON.stringify(steps);

    if (hasChanges) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          ingredients: JSON.stringify(cleanIngredients),
          steps: JSON.stringify(cleanSteps),
        },
      });
      cleaned++;
    }
  }

  return NextResponse.json({ cleaned, total: recipes.length });
}
