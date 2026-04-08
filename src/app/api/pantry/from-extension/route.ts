import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { createHash } from "crypto";

export async function POST(req: Request) {
  // Authenticate via API key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKeyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsed: new Date() },
  });

  const userId = await getHouseholdUserId(apiKeyRecord.userId);

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
