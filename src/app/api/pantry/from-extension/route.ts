import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-key-auth";

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.userId;
  const { name, url, price, category } = await req.json();

  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 }
    );
  }

  // Check if a pantry item with this name already exists
  const existing = await prisma.pantryItem.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) {
    // Update the existing item's Walmart URL
    const updated = await prisma.pantryItem.update({
      where: { id: existing.id },
      data: { walmartUrl: url },
    });
    return NextResponse.json({ action: "updated", item: updated });
  }

  // Create a new pantry item
  const item = await prisma.pantryItem.create({
    data: {
      userId,
      name,
      category: category ?? "other",
      unit: "count",
      qtyOnHand: 1,
      qtyMinimum: 0,
      walmartUrl: url,
    },
  });

  return NextResponse.json({ action: "created", item }, { status: 201 });
}
