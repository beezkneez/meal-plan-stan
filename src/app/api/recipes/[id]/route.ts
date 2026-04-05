import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(recipe);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const totalMinutes = (body.prepMinutes ?? 0) + (body.cookMinutes ?? 0);

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      title: body.title,
      sourceUrl: body.sourceUrl,
      imageUrl: body.imageUrl,
      prepMinutes: body.prepMinutes,
      cookMinutes: body.cookMinutes,
      totalMinutes,
      servings: body.servings,
      calories: body.calories,
      proteinG: body.proteinG,
      carbsG: body.carbsG,
      fatG: body.fatG,
      ingredients: JSON.stringify(body.ingredients ?? []),
      steps: JSON.stringify(body.steps ?? []),
      tags: JSON.stringify(body.tags ?? []),
      mealTypes: JSON.stringify(body.mealTypes ?? ["dinner"]),
      isQuick: totalMinutes <= 30,
      isSlowCook: body.isSlowCook ?? false,
      leftoverFriendly: body.leftoverFriendly ?? true,
    },
  });

  return NextResponse.json(recipe);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
