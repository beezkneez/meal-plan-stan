import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const sync = await prisma.googleTasksSync.findUnique({
    where: { userId },
  });

  return NextResponse.json({ sync });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { taskListId, taskListName, enabled } = await req.json();

  if (!taskListId || !taskListName) {
    return NextResponse.json(
      { error: "taskListId and taskListName are required" },
      { status: 400 }
    );
  }

  const sync = await prisma.googleTasksSync.upsert({
    where: { userId },
    create: {
      userId,
      taskListId,
      taskListName,
      enabled: enabled ?? true,
    },
    update: {
      taskListId,
      taskListName,
      enabled: enabled ?? true,
    },
  });

  return NextResponse.json({ sync });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  await prisma.googleTasksSync.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ ok: true });
}
