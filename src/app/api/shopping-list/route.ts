import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyIngredient, getSectionOrder } from "@/lib/grocery-sections";
import type { RecipeIngredient } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mealPlanId = url.searchParams.get("mealPlanId");

  // Get the most recent meal plan if no ID specified
  const plan = mealPlanId
    ? await prisma.mealPlan.findUnique({
        where: { id: mealPlanId },
        include: { slots: { include: { recipe: true } } },
      })
    : await prisma.mealPlan.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { slots: { include: { recipe: true } } },
      });

  if (!plan) {
    return NextResponse.json({ sections: [], message: "No meal plan found" });
  }

  // Aggregate ingredients from non-leftover slots
  const aggregated = new Map<
    string,
    { name: string; qty: number; unit: string }
  >();

  for (const slot of plan.slots) {
    if (slot.isLeftover || !slot.recipe) continue;

    const ingredients: RecipeIngredient[] = JSON.parse(
      slot.recipe.ingredients
    );
    const scale = slot.servings / slot.recipe.servings;

    for (const ing of ingredients) {
      const key = ing.name.toLowerCase().trim();
      const existing = aggregated.get(key);
      const scaledQty = (ing.qty ?? 1) * scale;

      if (existing) {
        existing.qty += scaledQty;
      } else {
        aggregated.set(key, {
          name: ing.name,
          qty: scaledQty,
          unit: ing.unit,
        });
      }
    }
  }

  // Subtract pantry
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId: session.user.id },
  });

  const pantryMap = new Map(
    pantryItems.map((p) => [p.name.toLowerCase().trim(), p])
  );

  const groceryItems: Array<{
    name: string;
    qty: number;
    unit: string;
    section: string;
  }> = [];

  for (const [key, item] of aggregated) {
    const pantryItem = pantryMap.get(key);
    let neededQty = item.qty;

    if (pantryItem) {
      neededQty = Math.max(0, item.qty - pantryItem.qtyOnHand);
    }

    if (neededQty > 0) {
      groceryItems.push({
        name: item.name,
        qty: Math.round(neededQty * 100) / 100,
        unit: item.unit,
        section: classifyIngredient(item.name),
      });
    }
  }

  // Group by section
  const sectionOrder = getSectionOrder();
  const sections = sectionOrder
    .map((sectionName) => ({
      name: sectionName,
      items: groceryItems
        .filter((i) => i.section === sectionName)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((s) => s.items.length > 0);

  return NextResponse.json({ sections });
}
