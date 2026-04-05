import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT: update a single meal slot (manual override)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slotId, recipeId, notes } = await req.json();

  if (!slotId) {
    return NextResponse.json({ error: "slotId required" }, { status: 400 });
  }

  // Verify the slot belongs to the user
  const slot = await prisma.mealSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: true },
  });

  if (!slot || slot.mealPlan.userId !== session.user.id) {
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
