import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: accept an invite token
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { owner: { select: { id: true, name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.used) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
  }

  if (invite.ownerId === session.user.id) {
    return NextResponse.json({ error: "Can't join your own household" }, { status: 400 });
  }

  // Check if user already in a household
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { householdId: true },
  });

  if (user?.householdId) {
    return NextResponse.json({ error: "You already belong to a household" }, { status: 400 });
  }

  // Join the household
  await prisma.user.update({
    where: { id: session.user.id },
    data: { householdId: invite.ownerId },
  });

  // Mark invite as used
  await prisma.householdInvite.update({
    where: { id: invite.id },
    data: { used: true },
  });

  return NextResponse.json({
    ok: true,
    ownerName: invite.owner.name,
  });
}
