import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getGoogleAccessToken,
  fetchGoogleCalendars,
} from "@/lib/google-calendar";

// GET: return Google calendars + which ones are synced
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google account linked. Please sign in with Google." },
      { status: 403 }
    );
  }

  const [googleCalendars, synced] = await Promise.all([
    fetchGoogleCalendars(accessToken),
    prisma.calendarSync.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const syncedIds = new Set(synced.map((s) => s.googleCalendarId));

  const calendars = googleCalendars.map((cal) => ({
    id: cal.id,
    name: cal.summary,
    color: cal.backgroundColor,
    primary: cal.primary,
    synced: syncedIds.has(cal.id),
    enabled: synced.find((s) => s.googleCalendarId === cal.id)?.enabled ?? false,
  }));

  return NextResponse.json(calendars);
}

// PUT: toggle a calendar's sync status
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { calendarId, calendarName, color, enabled } = await req.json();

  if (enabled) {
    await prisma.calendarSync.upsert({
      where: {
        userId_googleCalendarId: {
          userId: session.user.id,
          googleCalendarId: calendarId,
        },
      },
      create: {
        userId: session.user.id,
        googleCalendarId: calendarId,
        calendarName,
        color: color ?? "#4285f4",
        enabled: true,
      },
      update: { enabled: true, calendarName, color: color ?? "#4285f4" },
    });
  } else {
    await prisma.calendarSync.updateMany({
      where: {
        userId: session.user.id,
        googleCalendarId: calendarId,
      },
      data: { enabled: false },
    });
  }

  return NextResponse.json({ ok: true });
}
