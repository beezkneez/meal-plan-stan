import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMealPlan } from "@/lib/planner";
import type { ScheduleDay } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id },
    include: { slots: { include: { recipe: true } } },
    orderBy: { startDate: "desc" },
    take: 1,
  });

  return NextResponse.json(plans[0] ?? null);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    startDate,
    days = 16,
    householdSize = 4,
    leftoverWorkMeals = true,
    lunchDays = [0, 6],
    includeBreakfast = true,
  } = body;

  // Get user's schedule
  const schedule = await prisma.schedule.findUnique({
    where: { userId: session.user.id },
  });

  if (!schedule) {
    return NextResponse.json(
      { error: "Set up your work schedule first" },
      { status: 400 }
    );
  }

  // Get user's recipes with mealTypes
  const dbRecipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
  });

  const recipes = dbRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    totalMinutes: r.totalMinutes,
    servings: r.servings,
    proteinG: r.proteinG,
    isQuick: r.isQuick,
    isSlowCook: r.isSlowCook,
    leftoverFriendly: r.leftoverFriendly,
    tags: JSON.parse(r.tags) as string[],
    mealTypes: JSON.parse(r.mealTypes) as string[],
  }));

  // Get user preferences for protein target
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  const pattern: ScheduleDay[] = JSON.parse(schedule.pattern);

  const plannedSlots = generateMealPlan({
    startDate: new Date(startDate),
    days,
    schedule: pattern,
    anchorDate: schedule.anchorDate,
    recipes,
    calendarEvents: [],
    householdSize: prefs?.householdSize ?? householdSize,
    leftoverWorkMeals,
    targetProteinPerDay: 150,
    lunchDays,
    includeBreakfast,
  });

  // Delete old plans before creating new one
  await prisma.mealPlan.deleteMany({
    where: { userId: session.user.id },
  });

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate,
      slots: {
        create: plannedSlots.map((slot) => ({
          date: new Date(slot.date),
          mealType: slot.mealType,
          recipeId: slot.recipeId,
          servings: slot.servings,
          isLeftover: slot.isLeftover,
          leftoverSourceSlotId: null,
          notes: slot.notes,
        })),
      },
    },
    include: { slots: { include: { recipe: true } } },
  });

  return NextResponse.json(mealPlan, { status: 201 });
}
