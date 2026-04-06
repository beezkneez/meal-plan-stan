import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";

// PUT: update a single meal slot (manual override)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { slotId, recipeId, notes } = await req.json();

  if (!slotId) {
    return NextResponse.json({ error: "slotId required" }, { status: 400 });
  }

  const slot = await prisma.mealSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: true },
  });

  if (!slot || slot.mealPlan.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.mealSlot.update({
    where: { id: slotId },
    data: {
      recipeId: recipeId ?? null,
      notes: notes ?? null,
      isLeftover: false,
    },
    include: { recipe: true },
  });

  return NextResponse.json(updated);
}

// DELETE: remove a meal slot + cascade leftover lunches that depended on it
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { slotId, reason } = await req.json();

  if (!slotId) {
    return NextResponse.json({ error: "slotId required" }, { status: 400 });
  }

  const slot = await prisma.mealSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: true },
  });

  if (!slot || slot.mealPlan.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const removedSlotIds: string[] = [slotId];

  // If this is a dinner, find and remove leftover lunches the next day
  // that reference the same recipe
  if (slot.mealType === "dinner" && slot.recipeId) {
    const slotDate = new Date(slot.date);
    const nextDay = new Date(slotDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];

    const leftoverLunches = await prisma.mealSlot.findMany({
      where: {
        mealPlanId: slot.mealPlanId,
        mealType: "lunch",
        isLeftover: true,
        recipeId: slot.recipeId,
        date: {
          gte: new Date(nextDayStr + "T00:00:00Z"),
          lt: new Date(nextDayStr + "T23:59:59Z"),
        },
      },
    });

    removedSlotIds.push(...leftoverLunches.map((l) => l.id));
  }

  // Replace the slot with a "skipped" note instead of deleting
  // so the calendar still shows the day
  await prisma.mealSlot.update({
    where: { id: slotId },
    data: {
      recipeId: null,
      notes: reason ? `Skipped: ${reason}` : "Skipped",
      isLeftover: false,
      servings: 0,
    },
  });

  // Delete leftover lunches that depended on this dinner
  if (removedSlotIds.length > 1) {
    await prisma.mealSlot.deleteMany({
      where: { id: { in: removedSlotIds.slice(1) } },
    });
  }

  return NextResponse.json({ ok: true, removedSlotIds });
}

// POST: add a manual entry to the meal plan
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mealPlanId, date, mealType, notes, recipeId } = await req.json();

  if (!mealPlanId || !date || !mealType) {
    return NextResponse.json(
      { error: "mealPlanId, date, and mealType required" },
      { status: 400 }
    );
  }

  // Verify plan belongs to user
  const plan = await prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
  });

  const userId = await getHouseholdUserId(session.user.id);
  if (!plan || plan.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slot = await prisma.mealSlot.create({
    data: {
      mealPlanId,
      date: new Date(date),
      mealType,
      recipeId: recipeId ?? null,
      notes: notes ?? null,
      servings: 1,
      isLeftover: false,
    },
    include: { recipe: true },
  });

  return NextResponse.json(slot, { status: 201 });
}
