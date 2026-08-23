import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import type { RecipeIngredient } from "@/types";

// GET: the manually-added items currently on the list
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const items = await prisma.shoppingListItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

// POST: add items to the list without touching the meal plan.
// Either { recipeId, servings? } to pull in a whole recipe, or
// { items: [{ name, qty, unit }] } for one-offs.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const body = await req.json();

  if (body.recipeId) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: body.recipeId, userId },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // The approval dialog sends the exact lines the user confirmed, already
    // netted against the pantry and possibly edited. Trust them over the
    // recipe's own quantities.
    if (Array.isArray(body.items)) {
      const created = await prisma.shoppingListItem.createMany({
        data: body.items
          .filter((i: { name?: string }) => i.name?.trim())
          .map((i: { name: string; qty?: number; unit?: string }) => ({
            userId,
            name: i.name.trim(),
            qty: Number(i.qty) || 1,
            unit: i.unit ?? "",
            source: "recipe",
            recipeId: recipe.id,
            recipeTitle: recipe.title,
          })),
      });

      return NextResponse.json({ added: created.count, recipe: recipe.title });
    }

    const ingredients: RecipeIngredient[] = JSON.parse(recipe.ingredients);

    // Scale if the caller wants a different batch size than the recipe's default
    const servings = Number(body.servings) || recipe.servings;
    const scale = recipe.servings > 0 ? servings / recipe.servings : 1;

    const created = await prisma.shoppingListItem.createMany({
      data: ingredients.map((ing) => ({
        userId,
        name: ing.name.trim(),
        qty: Math.round((ing.qty ?? 1) * scale * 100) / 100,
        unit: ing.unit ?? "",
        source: "recipe",
        recipeId: recipe.id,
        recipeTitle: recipe.title,
      })),
    });

    return NextResponse.json({ added: created.count, recipe: recipe.title });
  }

  if (Array.isArray(body.items)) {
    const created = await prisma.shoppingListItem.createMany({
      data: body.items
        .filter((i: { name?: string }) => i.name?.trim())
        .map((i: { name: string; qty?: number; unit?: string }) => ({
          userId,
          name: i.name.trim(),
          qty: Number(i.qty) || 1,
          unit: i.unit ?? "",
          source: "manual",
        })),
    });

    return NextResponse.json({ added: created.count });
  }

  return NextResponse.json(
    { error: "Provide recipeId or items" },
    { status: 400 }
  );
}

// DELETE: ?id=<id> for one item, ?source=recipe|manual to clear a whole group,
// ?recipeId=<id> to drop everything that came from one recipe.
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const source = searchParams.get("source");
  const recipeId = searchParams.get("recipeId");

  if (!id && !source && !recipeId) {
    return NextResponse.json(
      { error: "Provide id, source, or recipeId" },
      { status: 400 }
    );
  }

  const deleted = await prisma.shoppingListItem.deleteMany({
    where: {
      userId,
      ...(id ? { id } : {}),
      ...(source ? { source } : {}),
      ...(recipeId ? { recipeId } : {}),
    },
  });

  return NextResponse.json({ deleted: deleted.count });
}
