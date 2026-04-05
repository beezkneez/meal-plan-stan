import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(schedule ?? {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pattern, anchorDate } = body;

  const schedule = await prisma.schedule.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
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
