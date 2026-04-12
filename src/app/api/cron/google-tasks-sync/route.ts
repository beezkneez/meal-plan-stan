import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-calendar";
import { syncTasksForUser } from "@/app/api/google-tasks/sync/route";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncs = await prisma.googleTasksSync.findMany({
    where: { enabled: true },
    include: { user: { select: { id: true, email: true } } },
  });

  const results: Array<{
    userId: string;
    email: string | null;
    imported: number;
    error?: string;
  }> = [];

  for (const sync of syncs) {
    try {
      const accessToken = await getGoogleAccessToken(sync.user.id);
      if (!accessToken) {
        results.push({
          userId: sync.user.id,
          email: sync.user.email,
          imported: 0,
          error: "No access token",
        });
        continue;
      }

      const result = await syncTasksForUser(
        sync.userId,
        sync.taskListId,
        accessToken
      );

      await prisma.googleTasksSync.update({
        where: { id: sync.id },
        data: { lastSyncAt: new Date() },
      });

      results.push({
        userId: sync.user.id,
        email: sync.user.email,
        imported: result.imported,
      });
    } catch (err) {
      results.push({
        userId: sync.user.id,
        email: sync.user.email,
        imported: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    syncedAt: new Date().toISOString(),
  });
}
