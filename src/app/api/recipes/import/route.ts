import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";

function stripHtml(text: string): string {
  return text
    .replace(/<\/li>\s*<li>/gi, ". ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ParsedRecipe {
  title: string;
  ingredients: { name: string; qty: number | null; unit: string }[];
  steps: string[];
  sourceUrl?: string;
  imageUrl?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
}

// Parse CopyMeThat export format
function parseCopyMeThat(text: string): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];

  // CopyMeThat exports recipes separated by lines of dashes or blank lines
  // Format varies but generally:
  // Title
  // Source: URL
  // Servings: X
  // Ingredients:
  // - ingredient lines
  // Directions/Instructions:
  // - step lines

  // Split by recipe separator (multiple blank lines or dashes)
  const blocks = text.split(/\n{3,}|^-{5,}$/m).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const recipe: ParsedRecipe = {
      title: "",
      ingredients: [],
      steps: [],
      servings: 4,
      prepMinutes: 0,
      cookMinutes: 0,
      tags: [],
    };

    let section: "none" | "ingredients" | "steps" = "none";

    for (let i = 0; i < lines.length; i++) {
      const line = stripHtml(lines[i]);
      const lower = line.toLowerCase();

      // Title is usually the first non-empty line
      if (!recipe.title && !lower.startsWith("source") && !lower.startsWith("http")) {
        recipe.title = line;
        continue;
      }

      // Source URL
      if (lower.startsWith("source:") || lower.startsWith("original url:")) {
        recipe.sourceUrl = line.replace(/^(source|original url):\s*/i, "").trim();
        continue;
      }
      if (lower.startsWith("http") && !recipe.sourceUrl) {
        recipe.sourceUrl = line;
        continue;
      }

      // Servings
      const servingsMatch = line.match(/(?:servings?|yields?|makes?):\s*(\d+)/i);
      if (servingsMatch) {
        recipe.servings = parseInt(servingsMatch[1]);
        continue;
      }

      // Prep/cook time
      const prepMatch = line.match(/prep(?:\s*time)?:\s*(\d+)\s*min/i);
      if (prepMatch) {
        recipe.prepMinutes = parseInt(prepMatch[1]);
        continue;
      }
      const cookMatch = line.match(/cook(?:\s*time)?:\s*(\d+)\s*min/i);
      if (cookMatch) {
        recipe.cookMinutes = parseInt(cookMatch[1]);
        continue;
      }
      const totalMatch = line.match(/total(?:\s*time)?:\s*(\d+)\s*min/i);
      if (totalMatch) {
        recipe.cookMinutes = parseInt(totalMatch[1]);
        continue;
      }

      // Section headers
      if (/^ingredients?:?\s*$/i.test(lower) || lower === "ingredients") {
        section = "ingredients";
        continue;
      }
      if (/^(directions?|instructions?|steps?|method|preparation):?\s*$/i.test(lower)) {
        section = "steps";
        continue;
      }

      // Tags/categories
      if (lower.startsWith("categories:") || lower.startsWith("tags:")) {
        const tagStr = line.replace(/^(categories|tags):\s*/i, "");
        recipe.tags = tagStr.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
        continue;
      }

      // Image
      if (lower.startsWith("photo:") || lower.startsWith("image:")) {
        recipe.imageUrl = line.replace(/^(photo|image):\s*/i, "").trim();
        continue;
      }

      // Content lines
      if (section === "ingredients") {
        const cleaned = line.replace(/^[-•*]\s*/, "");
        if (cleaned) {
          const match = cleaned.match(
            /^([\d./½⅓⅔¼¾⅛]+(?:\s*[-–]\s*[\d./]+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|kg|ml|l|cloves?|cans?|pieces?|slices?|stalks?)?\s*(.+)/i
          );
          if (match) {
            recipe.ingredients.push({
              qty: parseFloat(match[1]) || null,
              unit: match[2]?.toLowerCase() ?? "",
              name: match[3].trim(),
            });
          } else {
            recipe.ingredients.push({ qty: null, unit: "", name: cleaned });
          }
        }
      } else if (section === "steps") {
        const cleaned = line.replace(/^\d+[.)]\s*/, "").replace(/^[-•*]\s*/, "");
        if (cleaned) recipe.steps.push(cleaned);
      } else {
        // Auto-detect: if line starts with number or bullet and we have a title, guess ingredients
        if (recipe.title && /^[\d½⅓⅔¼¾⅛]/.test(line) && section === "none") {
          section = "ingredients";
          const cleaned = line.replace(/^[-•*]\s*/, "");
          recipe.ingredients.push({ qty: null, unit: "", name: cleaned });
        }
      }
    }

    if (recipe.title && (recipe.ingredients.length > 0 || recipe.steps.length > 0)) {
      recipes.push(recipe);
    }
  }

  return recipes;
}

// POST: bulk import recipes from uploaded text
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getHouseholdUserId(session.user.id);

  const body = await req.json();
  const { text, format: fmt } = body;

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  let parsed: ParsedRecipe[] = [];

  if (fmt === "copymethat" || !fmt) {
    parsed = parseCopyMeThat(text);
  }

  if (parsed.length === 0) {
    return NextResponse.json({
      error: "No recipes found in the uploaded text. Make sure it's a CopyMeThat export.",
      imported: 0,
    });
  }

  // If parseOnly flag, return parsed recipes for preview without importing
  if (body.parseOnly) {
    return NextResponse.json({ recipes: parsed, total: parsed.length });
  }

  // Import selected recipes (or all if no selection)
  const selectedIndices: number[] | null = body.selected ?? null;
  const toImport = selectedIndices
    ? parsed.filter((_, i) => selectedIndices.includes(i))
    : parsed;

  let imported = 0;
  for (const r of toImport) {
    const totalMinutes = (r.prepMinutes || 0) + (r.cookMinutes || 0);
    await prisma.recipe.create({
      data: {
        userId,
        title: r.title,
        sourceUrl: r.sourceUrl,
        imageUrl: r.imageUrl,
        prepMinutes: r.prepMinutes || 0,
        cookMinutes: r.cookMinutes || 0,
        totalMinutes,
        servings: r.servings || 4,
        ingredients: JSON.stringify(r.ingredients),
        steps: JSON.stringify(r.steps),
        tags: JSON.stringify(r.tags),
        mealTypes: JSON.stringify(["dinner"]),
        role: "complete",
        rating: 0,
        isQuick: totalMinutes > 0 && totalMinutes <= 30,
        isSlowCook: r.steps.some((s) => /slow.?cook|crock.?pot/i.test(s)),
        leftoverFriendly: true,
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, total: parsed.length });
}
