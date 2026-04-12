import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { getGoogleAccessToken } from "@/lib/google-calendar";
import { fetchTasks, completeTask } from "@/lib/google-tasks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const sync = await prisma.googleTasksSync.findUnique({
    where: { userId },
  });

  const pendingItems = await prisma.adHocItem.count({
    where: { userId, imported: false },
  });

  return NextResponse.json({
    lastSyncAt: sync?.lastSyncAt ?? null,
    enabled: sync?.enabled ?? false,
    pendingItems,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const sync = await prisma.googleTasksSync.findUnique({
    where: { userId },
  });

  if (!sync) {
    return NextResponse.json(
      { error: "Google Tasks not configured" },
      { status: 400 }
    );
  }

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google account not connected" },
      { status: 403 }
    );
  }

  const result = await syncTasksForUser(userId, sync.taskListId, accessToken);

  // Update last sync timestamp
  await prisma.googleTasksSync.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json(result);
}

export async function syncTasksForUser(
  userId: string,
  taskListId: string,
  accessToken: string
) {
  const tasks = await fetchTasks(accessToken, taskListId);

  if (tasks.length === 0) {
    return { imported: 0, tasks: [] };
  }

  // Get pantry items for fuzzy matching
  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId },
    select: { name: true, walmartUrl: true },
  });

  const imported: Array<{ name: string; matched: boolean }> = [];

  for (const task of tasks) {
    const taskName = task.title.trim();

    // Check if already imported (by googleTaskId)
    const existing = await prisma.adHocItem.findFirst({
      where: { userId, googleTaskId: task.id },
    });
    if (existing) continue;

    // Fuzzy match against pantry items
    const normalizedName = taskName.toLowerCase();
    const matched = pantryItems.find((p) => {
      const pName = p.name.toLowerCase();
      return (
        pName === normalizedName ||
        pName.includes(normalizedName) ||
        normalizedName.includes(pName)
      );
    });

    await prisma.adHocItem.create({
      data: {
        userId,
        name: taskName,
        qty: 1,
        unit: "",
        googleTaskId: task.id,
        walmartUrl: matched?.walmartUrl ?? null,
        imported: false,
      },
    });

    imported.push({ name: taskName, matched: !!matched });

    // Mark the task as completed in Google Tasks
    await completeTask(accessToken, taskListId, task.id);
  }

  return { imported: imported.length, tasks: imported };
}
