import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scrapeRecipe } from "@/lib/scraper";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const recipe = await scrapeRecipe(url);
    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scrape recipe. Try a different URL." },
      { status: 422 }
    );
  }
}
