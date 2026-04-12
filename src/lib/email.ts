import { Resend } from "resend";
import { prisma } from "./prisma";
import { getHouseholdUserId } from "./household";
import { buildWeeklyMealPlanEmail, buildShoppingCartEmail } from "./email-templates";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || "Meal Plan Stan <onboarding@resend.dev>";

export async function sendWeeklyEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return { success: false, reason: "no email" };

  const householdUserId = await getHouseholdUserId(userId);

  // Fetch user preferences
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: householdUserId },
  });
  const lowStockThreshold = prefs?.lowStockThreshold ?? 0.5;

  // Fetch the active meal plan with slots and recipes
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { userId: householdUserId },
    orderBy: { createdAt: "desc" },
    include: {
      slots: {
        include: { recipe: true },
        orderBy: [{ date: "asc" }, { mealType: "asc" }],
      },
    },
  });

  // Fetch low-stock pantry items
  const lowStockItems = await prisma.pantryItem.findMany({
    where: {
      userId: householdUserId,
      qtyOnHand: { lte: lowStockThreshold },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const html = buildWeeklyMealPlanEmail({
    userName: user.name || "there",
    mealPlan,
    lowStockItems,
    lowStockThreshold,
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: `Your Weekly Meal Plan${mealPlan ? ` (${new Date(mealPlan.startDate).toLocaleDateString("en-CA")} - ${new Date(mealPlan.endDate).toLocaleDateString("en-CA")})` : ""}`,
    html,
  });

  if (error) return { success: false, reason: error.message };
  return { success: true };
}

export async function sendShoppingEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return { success: false, reason: "no email" };

  const householdUserId = await getHouseholdUserId(userId);

  // Fetch the active meal plan
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { userId: householdUserId },
    orderBy: { createdAt: "desc" },
    include: {
      slots: {
        where: { isLeftover: false },
        include: { recipe: true },
      },
    },
  });

  if (!mealPlan) return { success: false, reason: "no meal plan" };

  // Fetch pantry items with Walmart URLs
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId: householdUserId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Fetch unmatched cart queue items (no Walmart link) for current week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const unmatchedCartItems = await prisma.cartQueueItem.findMany({
    where: {
      userId: householdUserId,
      weekOf: weekStart,
      status: "no_url",
    },
    orderBy: { name: "asc" },
  });

  const html = buildShoppingCartEmail({
    userName: user.name || "there",
    mealPlan,
    pantryItems,
    unmatchedCartItems: unmatchedCartItems.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      section: i.section,
      source: i.source,
    })),
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: "Your Walmart Shopping List is Ready!",
    html,
  });

  if (error) return { success: false, reason: error.message };
  return { success: true };
}
