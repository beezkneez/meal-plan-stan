import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

// GET: check if user has an API key
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.apiKey.findFirst({
    where: { userId: session.user.id },
    select: { id: true, createdAt: true, lastUsed: true },
  });

  return NextResponse.json({ hasKey: !!existing, keyInfo: existing });
}

// POST: generate a new API key (revokes existing)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Revoke any existing keys
  await prisma.apiKey.deleteMany({
    where: { userId: session.user.id },
  });

  // Generate a new key
  const rawKey = `mps_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      keyHash,
    },
  });

  // Return the raw key (only shown once)
  return NextResponse.json({ apiKey: rawKey });
}

// DELETE: revoke API key
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.apiKey.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
