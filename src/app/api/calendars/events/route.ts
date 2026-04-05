import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getGoogleAccessToken,
  fetchCalendarEvents,
} from "@/lib/google-calendar";

// GET: fetch events from all enabled synced calendars
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "16", 10);

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google account linked" },
      { status: 403 }
    );
  }

  const synced = await prisma.calendarSync.findMany({
    where: { userId: session.user.id, enabled: true },
  });

  if (synced.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  const timeMax = end.toISOString();

  const allEvents = await Promise.all(
    synced.map(async (cal) => {
      const events = await fetchCalendarEvents(
        accessToken,
        cal.googleCalendarId,
        timeMin,
        timeMax
      );
      return events.map((e) => ({
        ...e,
        calendarName: cal.calendarName,
        calendarColor: cal.color,
      }));
    })
  );

  const events = allEvents
    .flat()
    .sort((a, b) => {
      const aTime = a.start?.dateTime ?? a.start?.date ?? "";
      const bTime = b.start?.dateTime ?? b.start?.date ?? "";
      return aTime.localeCompare(bTime);
    });

  return NextResponse.json({ events });
}
