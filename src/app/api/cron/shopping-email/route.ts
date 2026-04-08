import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendShoppingEmail } from "@/lib/email";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  // Shopping email goes out the evening before the meal plan email day
  // e.g., if emailDay is Sunday (0), shopping email goes Saturday (6) evening
  // We send at emailHour + 6 hours (evening), on the day before emailDay
  const matchingPrefs = await prisma.userPreferences.findMany({
    where: {
      emailEnabled: true,
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  const toSend = matchingPrefs.filter((p) => {
    // Shopping email: same day as meal plan email, but 6 hours later (evening)
    // If emailTime is 14:00, shopping email at 20:00 same day
    const [emailHour] = p.emailTime.split(":").map(Number);
    const shoppingHour = emailHour + 6;
    return p.emailDay === currentDay && shoppingHour === currentHour;
  });

  const results: { userId: string; email: string | null; result: unknown }[] = [];

  for (const pref of toSend) {
    const result = await sendShoppingEmail(pref.user.id);
    results.push({
      userId: pref.user.id,
      email: pref.user.email,
      result,
    });
  }

  return NextResponse.json({
    processed: results.length,
    results,
    checkedAt: now.toISOString(),
  });
}
