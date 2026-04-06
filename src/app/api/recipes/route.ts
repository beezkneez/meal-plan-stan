import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const tag = url.searchParams.get("tag");

  let recipes = await prisma.recipe.findMany({
    where: {
      userId: session.user.id,
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (tag) {
    recipes = recipes.filter((r) => {
      const tags: string[] = JSON.parse(r.tags);
      return tags.includes(tag);
    });
  }

  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const totalMinutes = (body.prepMinutes ?? 0) + (body.cookMinutes ?? 0);
  const isQuick = totalMinutes <= 30;
  const isSlowCook =
    body.isSlowCook ??
    (body.steps ?? []).some((s: string) =>
      /slow.?cook|crock.?pot|instant.?pot/i.test(s)
    );

  const recipe = await prisma.recipe.create({
    data: {
      userId: session.user.id,
      title: body.title,
      sourceUrl: body.sourceUrl,
      imageUrl: body.imageUrl,
      prepMinutes: body.prepMinutes ?? 0,
      cookMinutes: body.cookMinutes ?? 0,
      totalMinutes,
      servings: body.servings ?? 4,
      calories: body.calories,
      proteinG: body.proteinG,
      carbsG: body.carbsG,
      fatG: body.fatG,
      ingredients: JSON.stringify(body.ingredients ?? []),
      steps: JSON.stringify(body.steps ?? []),
      tags: JSON.stringify(body.tags ?? []),
      mealTypes: JSON.stringify(body.mealTypes ?? ["dinner"]),
      role: body.role ?? "complete",
      rating: body.rating ?? 0,
      isQuick,
      isSlowCook,
      leftoverFriendly: body.leftoverFriendly ?? true,
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
