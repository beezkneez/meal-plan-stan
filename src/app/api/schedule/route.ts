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

  const schedule = await prisma.schedule.findUnique({
    where: { userId },
  });

  return NextResponse.json(schedule ?? {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();
  const { pattern, anchorDate } = body;

  const schedule = await prisma.schedule.upsert({
    where: { userId },
    create: {
      userId,
      pattern,
      anchorDate: new Date(anchorDate),
    },
    update: {
      pattern,
      anchorDate: new Date(anchorDate),
    },
  });

  return NextResponse.json(schedule);
}
