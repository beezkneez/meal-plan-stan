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

  const items = await prisma.pantryItem.findMany({
    where: { userId },
    orderBy: { category: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();

  const item = await prisma.pantryItem.create({
    data: {
      userId,
      name: body.name,
      category: body.category ?? "other",
      unit: body.unit ?? "count",
      qtyOnHand: body.qtyOnHand ?? 0,
      qtyMinimum: body.qtyMinimum ?? 0,
      walmartUrl: body.walmartUrl ?? null,
      walmartUrlBackup: body.walmartUrlBackup ?? null,
      walmartPricePreference: body.walmartPricePreference ?? "best_price",
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();
  const { id, ...data } = body;

  const item = await prisma.pantryItem.update({
    where: { id },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.pantryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
