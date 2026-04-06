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

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  return NextResponse.json(prefs ?? {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();

  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...body,
    },
    update: body,
  });

  return NextResponse.json(prefs);
}
