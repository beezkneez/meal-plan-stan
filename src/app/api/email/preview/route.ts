import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { buildWeeklyMealPlanEmail } from "@/lib/email-templates";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  const lowStockThreshold = prefs?.lowStockThreshold ?? 0.5;

  const mealPlan = await prisma.mealPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      slots: {
        include: { recipe: true },
        orderBy: [{ date: "asc" }, { mealType: "asc" }],
      },
    },
  });

  const lowStockItems = await prisma.pantryItem.findMany({
    where: {
      userId,
      qtyOnHand: { lte: lowStockThreshold },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const html = buildWeeklyMealPlanEmail({
    userName: session.user.name || "there",
    mealPlan,
    lowStockItems,
    lowStockThreshold,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
