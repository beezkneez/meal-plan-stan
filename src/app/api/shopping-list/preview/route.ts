import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { cleanIngredient, ingredientKey } from "@/lib/shopping-list-sources";
import type { RecipeIngredient } from "@/types";

/**
 * What adding this recipe would actually put on the list, after the pantry is
 * taken into account — shown for approval before anything is committed, so a
 * wrong pantry count gets caught here rather than in the shop.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { searchParams } = new URL(req.url);

  const recipeId = searchParams.get("recipeId");
  if (!recipeId) {
    return NextResponse.json({ error: "recipeId required" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const servings = Number(searchParams.get("servings")) || recipe.servings;
  const scale = recipe.servings > 0 ? servings / recipe.servings : 1;

  const pantryItems = await prisma.pantryItem.findMany({ where: { userId } });
  const pantryMap = new Map(
    pantryItems.map((p) => [ingredientKey(p.name), p])
  );

  const ingredients: RecipeIngredient[] = JSON.parse(recipe.ingredients);

  const items = ingredients.map((ing) => {
    const { name, unit } = cleanIngredient(ing);
    const needed = Math.round((ing.qty ?? 1) * scale * 100) / 100;
    const pantryItem = pantryMap.get(ingredientKey(name));
    const onHand = pantryItem?.qtyOnHand ?? 0;
    const toAdd = Math.round(Math.max(0, needed - onHand) * 100) / 100;

    return {
      name,
      unit,
      needed,
      onHand,
      toAdd,
      // Fully covered by the pantry — offered unticked rather than hidden, so
      // a stale pantry count can still be overridden.
      covered: toAdd === 0,
      inPantry: Boolean(pantryItem),
    };
  });

  return NextResponse.json({
    recipe: { id: recipe.id, title: recipe.title, servings },
    items,
  });
}
