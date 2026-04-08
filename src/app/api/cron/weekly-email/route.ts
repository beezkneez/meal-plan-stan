import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyEmail } from "@/lib/email";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun..6=Sat
  const currentHour = now.getHours();

  // Find all users whose email preferences match the current day/hour
  const matchingPrefs = await prisma.userPreferences.findMany({
    where: {
      emailEnabled: true,
      emailDay: currentDay,
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  // Filter by hour match
  const toSend = matchingPrefs.filter((p) => {
    const [hour] = p.emailTime.split(":").map(Number);
    return hour === currentHour;
  });

  const results: { userId: string; email: string | null; result: unknown }[] = [];

  for (const pref of toSend) {
    const result = await sendWeeklyEmail(pref.user.id);
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
