import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-key-auth";

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// GET: fetch pending items for the extension to process
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const weekOf = getWeekStart();

  const items = await prisma.cartQueueItem.findMany({
    where: {
      userId: auth.userId,
      weekOf,
      status: "pending",
      walmartUrl: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      qty: true,
      unit: true,
      walmartUrl: true,
      walmartUrlBackup: true,
      usedBackup: true,
    },
  });

  return NextResponse.json({ items });
}

// POST: batch status updates from extension
export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { updates } = await req.json();

  if (!Array.isArray(updates)) {
    return NextResponse.json(
      { error: "updates array required" },
      { status: 400 }
    );
  }

  const results: Array<{ id: string; status: string; action?: string }> = [];

  for (const update of updates) {
    const { id, status, errorNote } = update;

    const item = await prisma.cartQueueItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== authResult.userId) continue;

    // If OOS and has a backup URL, switch to backup and keep pending
    if (
      status === "failed" &&
      errorNote === "oos" &&
      item.walmartUrlBackup &&
      !item.usedBackup
    ) {
      await prisma.cartQueueItem.update({
        where: { id },
        data: {
          status: "pending",
          usedBackup: true,
          walmartUrl: item.walmartUrlBackup,
          errorNote: null,
        },
      });
      results.push({ id, status: "pending", action: "retry_backup" });
    } else {
      await prisma.cartQueueItem.update({
        where: { id },
        data: { status, errorNote: errorNote ?? null },
      });
      results.push({ id, status });
    }
  }

  return NextResponse.json({ results });
}
