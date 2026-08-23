import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyIngredient } from "@/lib/grocery-sections";
import { getHouseholdUserId } from "@/lib/household";
import { getExcludedKeys } from "@/lib/shopping-list-sources";
import type { RecipeIngredient } from "@/types";

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day; // Sunday as week start
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const weekOf = getWeekStart();

  const items = await prisma.cartQueueItem.findMany({
    where: { userId, weekOf },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    added: items.filter((i) => i.status === "added").length,
    failed: items.filter((i) => i.status === "failed").length,
    noUrl: items.filter((i) => i.status === "no_url").length,
  };

  return NextResponse.json({ items, summary, weekOf });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const weekOf = getWeekStart();

  // Clear existing pending/no_url items for this week (regenerate)
  await prisma.cartQueueItem.deleteMany({
    where: {
      userId,
      weekOf,
      status: { in: ["pending", "no_url"] },
    },
  });

  // Get the most recent meal plan
  const plan = await prisma.mealPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { slots: { include: { recipe: true } } },
  });

  // Get pantry items for Walmart URL matching
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId },
  });
  const pantryMap = new Map(
    pantryItems.map((p) => [p.name.toLowerCase().trim(), p])
  );

  const queueItems: Array<{
    userId: string;
    name: string;
    qty: number;
    unit: string;
    section: string;
    walmartUrl: string | null;
    walmartUrlBackup: string | null;
    source: string;
    status: string;
    weekOf: Date;
  }> = [];

  const excludedKeys = await getExcludedKeys(userId, plan?.id ?? null);

  // One bucket per ingredient, shared by the meal plan and by items added
  // straight to the shopping list — otherwise the same ingredient wanted by
  // two sources becomes two queue lines and gets bought twice.
  const aggregated = new Map<
    string,
    { name: string; qty: number; unit: string; source: string }
  >();

  // Aggregate ingredients from meal plan (same logic as shopping-list route)
  if (plan) {
    for (const slot of plan.slots) {
      if (slot.isLeftover || !slot.recipe) continue;

      const ingredients: RecipeIngredient[] = JSON.parse(
        slot.recipe.ingredients
      );
      const scale = slot.servings / slot.recipe.servings;

      for (const ing of ingredients) {
        const junkUnits =
          /^(units?|count|pieces?|items?|servings?|unit\(s\))$/i;
        let cleanName = ing.name
          .replace(/^\s*\d+\s*(units?|unit\(s\)|pieces?|counts?)\s+/i, "")
          .trim();
        cleanName = cleanName.replace(/\s*,?\s*unit\(s\)\s*/gi, "").trim();
        const cleanUnit = junkUnits.test(ing.unit?.trim() ?? "")
          ? ""
          : (ing.unit ?? "");
        const key = cleanName.toLowerCase().trim();
        // Items cleared off the shopping list must not sneak into the cart
        if (excludedKeys.has(key)) continue;

        const existing = aggregated.get(key);
        const scaledQty = (ing.qty ?? 1) * scale;

        if (existing) {
          existing.qty += scaledQty;
        } else {
          aggregated.set(key, {
            name: cleanName,
            qty: scaledQty,
            unit: cleanUnit,
            source: "meal_plan",
          });
        }
      }
    }

  }

  // Fold in items added straight to the shopping list — a recipe pushed to the
  // list, or an extra typed in. These merge into the same buckets, so garlic
  // wanted by both the plan and an added recipe is one line of 5 cloves rather
  // than two lines that each get bought.
  const listItems = await prisma.shoppingListItem.findMany({
    where: { userId },
  });

  for (const item of listItems) {
    const key = item.name.toLowerCase().trim();
    const existing = aggregated.get(key);

    if (existing) {
      existing.qty += item.qty;
    } else {
      aggregated.set(key, {
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        source: item.source === "manual" ? "manual" : "meal_plan",
      });
    }
  }

  // Subtract pantry and build exactly one queue line per ingredient
  for (const [key, item] of aggregated) {
    const pantryItem = pantryMap.get(key);
    const neededQty = pantryItem
      ? Math.max(0, item.qty - pantryItem.qtyOnHand)
      : item.qty;

    if (neededQty <= 0) continue; // fully covered by pantry

    queueItems.push({
      userId,
      name: item.name,
      qty: Math.round(neededQty * 100) / 100,
      unit: item.unit,
      section: classifyIngredient(item.name),
      walmartUrl: pantryItem?.walmartUrl ?? null,
      walmartUrlBackup: pantryItem?.walmartUrlBackup ?? null,
      source: item.source,
      status: pantryItem?.walmartUrl ? "pending" : "no_url",
      weekOf,
    });
  }

  // Pull in unimported ad-hoc items (from Google Tasks)
  const adHocItems = await prisma.adHocItem.findMany({
    where: { userId, imported: false },
  });

  for (const item of adHocItems) {
    queueItems.push({
      userId,
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      section: classifyIngredient(item.name),
      walmartUrl: item.walmartUrl ?? null,
      walmartUrlBackup: null,
      source: "google_tasks",
      status: item.walmartUrl ? "pending" : "no_url",
      weekOf,
    });
  }

  // Mark ad-hoc items as imported
  if (adHocItems.length > 0) {
    await prisma.adHocItem.updateMany({
      where: {
        id: { in: adHocItems.map((i) => i.id) },
      },
      data: { imported: true },
    });
  }

  // Bulk create cart queue items
  const created = await prisma.cartQueueItem.createMany({
    data: queueItems,
  });

  // Fetch back the full list for response
  const items = await prisma.cartQueueItem.findMany({
    where: { userId, weekOf },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    added: items.filter((i) => i.status === "added").length,
    failed: items.filter((i) => i.status === "failed").length,
    noUrl: items.filter((i) => i.status === "no_url").length,
  };

  return NextResponse.json({
    items,
    summary,
    weekOf,
    created: created.count,
  });
}
