import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  searchSpoonacular,
  generateAIRecipes,
} from "@/lib/recipe-discovery";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "family dinner";
  const mealType = searchParams.get("mealType") ?? "dinner";
  const source = searchParams.get("source") ?? "both"; // "spoonacular" | "ai" | "both"

  // Load user preferences for AI generation
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  const preferences = prefs
    ? {
        eatingStyle: prefs.eatingStyle,
        dislikes: JSON.parse(prefs.dislikes) as string[],
        allergies: JSON.parse(prefs.allergies) as string[],
        dietaryNeeds: JSON.parse(prefs.dietaryNeeds) as string[],
        householdSize: prefs.householdSize,
      }
    : {};

  let recipes: Awaited<ReturnType<typeof searchSpoonacular>> = [];

  if (source === "spoonacular" || source === "both") {
    const spoonResults = await searchSpoonacular(query, mealType, 6);
    recipes.push(...spoonResults);
  }

  if (source === "ai" || (source === "both" && recipes.length < 3)) {
    const aiResults = await generateAIRecipes(
      preferences,
      mealType,
      source === "ai" ? 6 : 4
    );
    recipes.push(...aiResults);
  }

  return NextResponse.json({ recipes });
}

// POST: approve a discovered recipe and add to user's recipe book
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const totalMinutes = (body.prepMinutes ?? 0) + (body.cookMinutes ?? 0);

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
      isQuick: totalMinutes <= 30,
      isSlowCook: false,
      leftoverFriendly: true,
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
