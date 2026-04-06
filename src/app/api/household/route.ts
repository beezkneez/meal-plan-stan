import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: get household info
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      householdId: true,
      householdOwner: {
        select: { id: true, name: true, email: true },
      },
      householdMembers: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = !user.householdId;
  const members = isOwner ? user.householdMembers : [];
  const owner = user.householdOwner;

  return NextResponse.json({
    isOwner,
    owner: isOwner ? { id: user.id, name: user.name, email: user.email } : owner,
    members,
  });
}

// POST: invite a member by email
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Find the user to invite
  const invitee = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!invitee) {
    return NextResponse.json(
      { error: "User not found. They need to sign in at least once first." },
      { status: 404 }
    );
  }

  if (invitee.id === session.user.id) {
    return NextResponse.json(
      { error: "Can't invite yourself" },
      { status: 400 }
    );
  }

  if (invitee.householdId) {
    return NextResponse.json(
      { error: "User already belongs to a household" },
      { status: 400 }
    );
  }

  // Link them to this user's household
  await prisma.user.update({
    where: { id: invitee.id },
    data: { householdId: session.user.id },
  });

  return NextResponse.json({ ok: true, member: { id: invitee.id, name: invitee.name, email: invitee.email } });
}

// DELETE: remove a member from household
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await req.json();

  const member = await prisma.user.findUnique({
    where: { id: memberId },
  });

  if (!member || member.householdId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: memberId },
    data: { householdId: null },
  });

  return NextResponse.json({ ok: true });
}
