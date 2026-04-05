import { prisma } from "./prisma";

interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  primary?: boolean;
  accessRole: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account?.access_token) return null;

  // Check if token is expired and refresh if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!account.refresh_token) return null;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;

    const tokens = await res.json();

    // Update stored token
    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
    });

    return tokens.access_token;
  }

  return account.access_token;
}

export async function fetchGoogleCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((cal: GoogleCalendar) => ({
    id: cal.id,
    summary: cal.summary,
    backgroundColor: cal.backgroundColor,
    primary: cal.primary ?? false,
    accessRole: cal.accessRole,
  }));
}

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? [])
    .filter((e: GoogleEvent) => e.status !== "cancelled")
    .map((e: GoogleEvent) => ({
      id: e.id,
      summary: e.summary ?? "(No title)",
      start: e.start,
      end: e.end,
    }));
}
