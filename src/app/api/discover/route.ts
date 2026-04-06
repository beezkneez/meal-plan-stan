import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import {
  searchSpoonacular,
  generateAIRecipes,
} from "@/lib/recipe-discovery";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "family dinner";
  const mealType = searchParams.get("mealType") ?? "dinner";
  const source = searchParams.get("source") ?? "both";
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  // Load user preferences for AI generation
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
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
    const spoonResults = await searchSpoonacular(query, mealType, 8, offset);
    recipes.push(...spoonResults);
  }

  if (source === "ai" || source === "both") {
    const aiCount = source === "ai" ? 8 : (recipes.length < 4 ? 6 : 4);
    const aiResults = await generateAIRecipes(
      preferences,
      mealType,
      aiCount,
      offset
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

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();

  const totalMinutes = (body.prepMinutes ?? 0) + (body.cookMinutes ?? 0);

  const recipe = await prisma.recipe.create({
    data: {
      userId,
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
