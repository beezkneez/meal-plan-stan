import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyIngredient, getSectionOrder } from "@/lib/grocery-sections";
import { getHouseholdUserId } from "@/lib/household";
import { getExcludedKeys } from "@/lib/shopping-list-sources";
import type { RecipeIngredient } from "@/types";

// POST: deduct pantry items when shopping list is "used"
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const { deductions } = await req.json();
  // deductions: [{ name: string, qty: number }]

  if (!Array.isArray(deductions)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId },
  });

  for (const d of deductions) {
    const pantryItem = pantryItems.find(
      (p) => p.name.toLowerCase().trim() === d.name.toLowerCase().trim()
    );
    if (pantryItem) {
      const newQty = Math.max(0, pantryItem.qtyOnHand - d.qty);
      await prisma.pantryItem.update({
        where: { id: pantryItem.id },
        data: { qtyOnHand: newQty },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const url = new URL(req.url);
  const mealPlanId = url.searchParams.get("mealPlanId");
  const week = url.searchParams.get("week"); // "1", "2", or null for all

  // Get the most recent meal plan if no ID specified
  const plan = mealPlanId
    ? await prisma.mealPlan.findUnique({
        where: { id: mealPlanId },
        include: { slots: { include: { recipe: true } } },
      })
    : await prisma.mealPlan.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { slots: { include: { recipe: true } } },
      });

  // A missing plan is no longer fatal — items added straight to the list
  // (from a recipe, or typed in by hand) stand on their own.
  let slots = plan?.slots ?? [];
  let totalDays = 0;

  if (plan) {
    const planStart = new Date(plan.startDate);
    totalDays =
      Math.ceil(
        (new Date(plan.endDate).getTime() - planStart.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    const midpoint = Math.ceil(totalDays / 2);

    if (week === "1") {
      const cutoff = new Date(planStart);
      cutoff.setDate(cutoff.getDate() + midpoint);
      slots = slots.filter((s) => new Date(s.date) < cutoff);
    } else if (week === "2") {
      const cutoff = new Date(planStart);
      cutoff.setDate(cutoff.getDate() + midpoint);
      slots = slots.filter((s) => new Date(s.date) >= cutoff);
    }
  }

  // Aggregate ingredients from non-leftover slots.
  // `sources` records where each line came from so the UI can filter and clear
  // by origin — one item can legitimately come from several places at once.
  const aggregated = new Map<
    string,
    {
      name: string;
      qty: number;
      unit: string;
      sources: Set<string>;
      recipeTitles: Set<string>;
    }
  >();

  // Ingredients the user has cleared off this plan's list. Skipped entirely so
  // they reach neither the list nor, later, the Walmart cart queue.
  const excludedKeys = await getExcludedKeys(userId, plan?.id ?? null);

  for (const slot of slots) {
    if (slot.isLeftover || !slot.recipe) continue;

    const ingredients: RecipeIngredient[] = JSON.parse(
      slot.recipe.ingredients
    );
    const scale = slot.servings / slot.recipe.servings;

    for (const ing of ingredients) {
      // Clean up generic unit words from name and unit
      const junkUnits = /^(units?|count|pieces?|items?|servings?|unit\(s\))$/i;
      let cleanName = ing.name.replace(/^\s*\d+\s*(units?|unit\(s\)|pieces?|counts?)\s+/i, "").trim();
      cleanName = cleanName.replace(/\s*,?\s*unit\(s\)\s*/gi, "").trim();
      const cleanUnit = junkUnits.test(ing.unit?.trim() ?? "") ? "" : (ing.unit ?? "");
      const key = cleanName.toLowerCase().trim();
      if (excludedKeys.has(key)) continue;

      const existing = aggregated.get(key);
      const scaledQty = (ing.qty ?? 1) * scale;

      if (existing) {
        existing.qty += scaledQty;
        existing.sources.add("meal_plan");
      } else {
        aggregated.set(key, {
          name: cleanName,
          qty: scaledQty,
          unit: cleanUnit,
          sources: new Set(["meal_plan"]),
          recipeTitles: new Set<string>(),
        });
      }
    }
  }

  // Fold in items added directly to the list, tagged by where they came from
  const storedItems = await prisma.shoppingListItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  for (const item of storedItems) {
    const key = item.name.toLowerCase().trim();
    const existing = aggregated.get(key);

    if (existing) {
      existing.qty += item.qty;
      existing.sources.add(item.source);
      if (item.recipeTitle) existing.recipeTitles.add(item.recipeTitle);
    } else {
      aggregated.set(key, {
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        sources: new Set([item.source]),
        recipeTitles: new Set(item.recipeTitle ? [item.recipeTitle] : []),
      });
    }
  }

  // Subtract pantry (only for first trip or full list)
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId },
  });

  const pantryMap = new Map(
    pantryItems.map((p) => [p.name.toLowerCase().trim(), p])
  );

  const groceryItems: Array<{
    name: string;
    qty: number;
    unit: string;
    section: string;
    fromPantry?: boolean;
    pantryQty?: number;
    totalNeeded?: number;
    walmartUrl?: string | null;
    walmartUrlBackup?: string | null;
    walmartPricePreference?: string;
    sources: string[];
    recipeTitles: string[];
  }> = [];

  const pantryDeductions: Array<{ name: string; qty: number }> = [];

  for (const [key, item] of aggregated) {
    const pantryItem = pantryMap.get(key);
    let neededQty = item.qty;

    if (pantryItem && (week !== "2")) {
      const deducted = Math.min(pantryItem.qtyOnHand, item.qty);
      neededQty = Math.max(0, item.qty - pantryItem.qtyOnHand);
      if (deducted > 0) {
        pantryDeductions.push({ name: item.name, qty: deducted });
      }
    }

    const matchedPantry = pantryMap.get(key);
    groceryItems.push({
      name: item.name,
      qty: Math.round(neededQty * 100) / 100,
      unit: item.unit,
      section: classifyIngredient(item.name),
      fromPantry: neededQty === 0,
      pantryQty: matchedPantry?.qtyOnHand ?? 0,
      totalNeeded: Math.round(item.qty * 100) / 100,
      walmartUrl: matchedPantry?.walmartUrl ?? null,
      walmartUrlBackup: matchedPantry?.walmartUrlBackup ?? null,
      walmartPricePreference: matchedPantry?.walmartPricePreference ?? "best_price",
      sources: [...item.sources],
      recipeTitles: [...item.recipeTitles],
    });
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

  return NextResponse.json({ sections, week, planDays: totalDays, pantryDeductions });
}
