import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { matchWalmartProducts, type WalmartCandidate } from "@/lib/walmart-match";

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// GET: cart queue items that still have no Walmart link, with the search URL
// the extension should scrape for each one.
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const weekOf = getWeekStart();

  const items = await prisma.cartQueueItem.findMany({
    where: { userId: auth.userId, weekOf, status: "no_url" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, qty: true, unit: true },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      searchUrl: `https://www.walmart.ca/search?q=${encodeURIComponent(item.name)}`,
    })),
  });
}

// POST: the extension sends scraped candidates; Claude picks the best product
// for each, and matched items become "pending" so the cart run can add them.
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json()) as {
    items?: Array<{ id: string; candidates: WalmartCandidate[] }>;
  };

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const weekOf = getWeekStart();

  // Only consider queue items that really belong to this user and still need a link
  const queueItems = await prisma.cartQueueItem.findMany({
    where: {
      userId: auth.userId,
      weekOf,
      status: "no_url",
      id: { in: body.items.map((i) => i.id) },
    },
    select: { id: true, name: true, qty: true, unit: true },
  });

  const candidatesById = new Map(body.items.map((i) => [i.id, i.candidates ?? []]));

  const requests = queueItems.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    candidates: candidatesById.get(item.id) ?? [],
  }));

  if (requests.length === 0) {
    return NextResponse.json({ matched: 0, unmatched: 0, results: [] });
  }

  // Let the error surface — a silent empty result here looks like "no matches
  // found" when the real cause is a missing key or a bad response.
  const matches = await matchWalmartProducts(requests);

  const nameById = new Map(queueItems.map((i) => [i.id, i.name]));
  const results: Array<{
    id: string;
    name: string;
    matched: boolean;
    url: string | null;
    reason: string;
  }> = [];

  let matchedCount = 0;

  for (const match of matches) {
    const name = nameById.get(match.id);
    if (!name) continue;

    if (match.walmartUrl) {
      matchedCount++;

      await prisma.cartQueueItem.update({
        where: { id: match.id },
        data: {
          walmartUrl: match.walmartUrl,
          walmartUrlBackup: match.walmartUrlBackup,
          status: "pending",
        },
      });

      // Remember the match on the pantry item so future weeks skip the search.
      // Only updates an existing entry — this never invents pantry rows.
      await prisma.pantryItem.updateMany({
        where: { userId: auth.userId, name, walmartUrl: null },
        data: {
          walmartUrl: match.walmartUrl,
          walmartUrlBackup: match.walmartUrlBackup,
        },
      });
    }

    results.push({
      id: match.id,
      name,
      matched: Boolean(match.walmartUrl),
      url: match.walmartUrl,
      reason: match.reason,
    });
  }

  return NextResponse.json({
    matched: matchedCount,
    unmatched: results.length - matchedCount,
    results,
  });
}
