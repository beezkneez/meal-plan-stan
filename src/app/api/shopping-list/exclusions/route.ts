import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { cleanIngredient, ingredientKey } from "@/lib/shopping-list-sources";
import type { RecipeIngredient } from "@/types";

async function latestPlanId(userId: string): Promise<string | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return plan?.id ?? null;
}

// POST: clear meal-plan items off the list.
// { names: [...] } for specific items, or { allMealPlan: true } for the lot.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const body = await req.json();

  const mealPlanId = await latestPlanId(userId);
  if (!mealPlanId) {
    return NextResponse.json({ error: "No meal plan found" }, { status: 400 });
  }

  let keys: string[] = [];

  if (body.allMealPlan) {
    // Walk the plan and collect every ingredient it contributes
    const plan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: { slots: { include: { recipe: true } } },
    });

    const collected = new Set<string>();
    for (const slot of plan?.slots ?? []) {
      if (slot.isLeftover || !slot.recipe) continue;
      const ingredients: RecipeIngredient[] = JSON.parse(
        slot.recipe.ingredients
      );
      for (const ing of ingredients) {
        collected.add(ingredientKey(cleanIngredient(ing).name));
      }
    }
    keys = [...collected];
  } else if (Array.isArray(body.names)) {
    keys = body.names
      .filter((n: unknown): n is string => typeof n === "string" && !!n.trim())
      .map(ingredientKey);
  }

  if (keys.length === 0) {
    return NextResponse.json({ excluded: 0 });
  }

  const created = await prisma.shoppingListExclusion.createMany({
    data: keys.map((nameKey) => ({ userId, mealPlanId, nameKey })),
    skipDuplicates: true,
  });

  return NextResponse.json({ excluded: created.count });
}

// DELETE: put cleared items back. ?name=<one> or ?all=true for this plan.
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { searchParams } = new URL(req.url);

  const mealPlanId = await latestPlanId(userId);
  if (!mealPlanId) {
    return NextResponse.json({ restored: 0 });
  }

  const name = searchParams.get("name");
  const all = searchParams.get("all") === "true";

  if (!name && !all) {
    return NextResponse.json(
      { error: "Provide name or all=true" },
      { status: 400 }
    );
  }

  const deleted = await prisma.shoppingListExclusion.deleteMany({
    where: {
      userId,
      mealPlanId,
      ...(name ? { nameKey: ingredientKey(name) } : {}),
    },
  });

  return NextResponse.json({ restored: deleted.count });
}
