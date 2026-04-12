import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);
  const { id } = await params;
  const { status, errorNote } = await req.json();

  const item = await prisma.cartQueueItem.findUnique({
    where: { id },
  });

  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If OOS and has backup URL, signal to use backup
  if (status === "failed" && errorNote === "oos" && item.walmartUrlBackup) {
    const updated = await prisma.cartQueueItem.update({
      where: { id },
      data: {
        status: "pending",
        usedBackup: true,
        walmartUrl: item.walmartUrlBackup,
        errorNote: null,
      },
    });
    return NextResponse.json({
      item: updated,
      action: "retry_backup",
      backupUrl: item.walmartUrlBackup,
    });
  }

  const updated = await prisma.cartQueueItem.update({
    where: { id },
    data: {
      status,
      errorNote: errorNote ?? null,
    },
  });

  return NextResponse.json({ item: updated });
}
