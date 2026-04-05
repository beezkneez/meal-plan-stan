import { differenceInDays } from "date-fns";
import type { ShiftType, ScheduleDay, BusynessLevel, CalendarEvent } from "@/types";

interface PlannerRecipe {
  id: string;
  title: string;
  totalMinutes: number;
  servings: number;
  proteinG: number | null;
  isQuick: boolean;
  isSlowCook: boolean;
  leftoverFriendly: boolean;
  tags: string[];
}

interface PlannedSlot {
  date: string; // ISO date string
  mealType: "breakfast" | "lunch" | "dinner";
  recipeId: string | null;
  recipeTitle: string;
  servings: number;
  isLeftover: boolean;
  leftoverSourceDate?: string;
  notes?: string;
}

interface PlannerInput {
  startDate: Date;
  days: number;
  schedule: ScheduleDay[];
  anchorDate: Date;
  recipes: PlannerRecipe[];
  calendarEvents: CalendarEvent[];
  householdSize: number;
  leftoverWorkMeals: boolean;
  targetProteinPerDay: number;
}

export function generateMealPlan(input: PlannerInput): PlannedSlot[] {
  const {
    startDate,
    days,
    schedule,
    anchorDate,
    recipes,
    householdSize,
    leftoverWorkMeals,
    targetProteinPerDay,
  } = input;

  const slots: PlannedSlot[] = [];
  const recentlyUsed = new Map<string, number>(); // recipeId -> days since used
  const dinnerRecipes = recipes.filter(
    (r) => !r.tags.includes("breakfast")
  );
  const breakfastRecipes = recipes.filter((r) => r.tags.includes("breakfast"));

  // Simple breakfast rotation if no breakfast recipes tagged
  const defaultBreakfasts = [
    "Eggs & Toast",
    "Oatmeal & Berries",
    "Protein Smoothie",
    "Greek Yogurt Bowl",
  ];

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];

    const shift = getShiftForDate(date, anchorDate, schedule);
    const busyness = classifyBusyness(shift, input.calendarEvents, date);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextShift =
      d < days - 1
        ? getShiftForDate(nextDate, anchorDate, schedule)
        : "OFF";
    const tomorrowIsWork =
      nextShift === "DAY" || nextShift === "NIGHT";

    // === BREAKFAST ===
    if (breakfastRecipes.length > 0) {
      const br = breakfastRecipes[d % breakfastRecipes.length];
      slots.push({
        date: dateStr,
        mealType: "breakfast",
        recipeId: br.id,
        recipeTitle: br.title,
        servings: householdSize,
        isLeftover: false,
      });
    } else {
      slots.push({
        date: dateStr,
        mealType: "breakfast",
        recipeId: null,
        recipeTitle: defaultBreakfasts[d % defaultBreakfasts.length],
        servings: householdSize,
        isLeftover: false,
        notes: "Quick staple breakfast",
      });
    }

    // === DINNER ===
    const dinnerRecipe = pickDinnerRecipe(
      dinnerRecipes,
      busyness,
      recentlyUsed,
      d,
      targetProteinPerDay
    );

    const dinnerServings =
      leftoverWorkMeals && tomorrowIsWork && dinnerRecipe?.leftoverFriendly
        ? householdSize + 1
        : householdSize;

    if (dinnerRecipe) {
      recentlyUsed.set(dinnerRecipe.id, d);
    }

    slots.push({
      date: dateStr,
      mealType: "dinner",
      recipeId: dinnerRecipe?.id ?? null,
      recipeTitle: dinnerRecipe?.title ?? "Plan a meal",
      servings: dinnerServings,
      isLeftover: false,
    });

    // === LUNCH ===
    const isWorkDay = shift === "DAY" || shift === "NIGHT";

    // Check if yesterday's dinner had leftovers for us
    const yesterdayDinnerSlot = slots.find(
      (s) => {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        return (
          s.date === yesterday.toISOString().split("T")[0] &&
          s.mealType === "dinner" &&
          !s.isLeftover
        );
      }
    );

    const hasLeftovers =
      isWorkDay &&
      leftoverWorkMeals &&
      yesterdayDinnerSlot &&
      yesterdayDinnerSlot.servings > householdSize;

    if (hasLeftovers) {
      slots.push({
        date: dateStr,
        mealType: "lunch",
        recipeId: yesterdayDinnerSlot.recipeId,
        recipeTitle: `Leftover: ${yesterdayDinnerSlot.recipeTitle}`,
        servings: 1,
        isLeftover: true,
        leftoverSourceDate: yesterdayDinnerSlot.date,
      });
    } else {
      // Pick a quick lunch recipe or mark as "light meal"
      const quickLunch = dinnerRecipes.find(
        (r) => r.isQuick && !recentlyUsed.has(r.id)
      );
      slots.push({
        date: dateStr,
        mealType: "lunch",
        recipeId: quickLunch?.id ?? null,
        recipeTitle: quickLunch?.title ?? "Light lunch / salad",
        servings: isWorkDay ? 1 : householdSize,
        isLeftover: false,
        notes: isWorkDay ? "Pack for work" : undefined,
      });
    }
  }

  return slots;
}

function pickDinnerRecipe(
  recipes: PlannerRecipe[],
  busyness: BusynessLevel,
  recentlyUsed: Map<string, number>,
  currentDay: number,
  targetProtein: number
): PlannerRecipe | null {
  if (recipes.length === 0) return null;

  // Filter by time budget
  let candidates = recipes;
  if (busyness === "busy") {
    const quickOrSlow = recipes.filter((r) => r.isQuick || r.isSlowCook);
    if (quickOrSlow.length > 0) candidates = quickOrSlow;
  } else if (busyness === "moderate") {
    const under45 = recipes.filter((r) => r.totalMinutes <= 45 || r.isSlowCook);
    if (under45.length > 0) candidates = under45;
  }

  // Score each candidate
  const scored = candidates.map((recipe) => {
    const daysSinceUsed = recentlyUsed.has(recipe.id)
      ? currentDay - recentlyUsed.get(recipe.id)!
      : 16;

    const varietyScore = Math.min(daysSinceUsed / 16, 1);
    const proteinScore =
      recipe.proteinG != null
        ? Math.min(recipe.proteinG / (targetProtein / 3), 1)
        : 0.5;
    const leftoverScore = recipe.leftoverFriendly ? 1 : 0.5;
    const quickScore =
      busyness === "busy" && (recipe.isQuick || recipe.isSlowCook) ? 1 : 0.7;

    const score =
      proteinScore * 0.4 +
      varietyScore * 0.25 +
      leftoverScore * 0.2 +
      quickScore * 0.15;

    return { recipe, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Weighted random from top 3
  const top = scored.slice(0, Math.min(3, scored.length));
  const totalWeight = top.reduce((sum, s) => sum + s.score, 0);
  let random = Math.random() * totalWeight;
  for (const entry of top) {
    random -= entry.score;
    if (random <= 0) return entry.recipe;
  }

  return top[0].recipe;
}

export function getShiftForDate(
  date: Date,
  anchorDate: Date,
  pattern: ScheduleDay[]
): ShiftType {
  const daysDiff = differenceInDays(date, anchorDate);
  const index = ((daysDiff % 16) + 16) % 16;
  return pattern[index]?.shift ?? "OFF";
}

function classifyBusyness(
  shift: ShiftType,
  events: CalendarEvent[],
  date: Date
): BusynessLevel {
  const dateStr = date.toISOString().split("T")[0];
  const dayEvents = events.filter((e) => e.start.startsWith(dateStr));

  if (shift === "OFF" && dayEvents.length === 0) return "free";
  if (shift === "OFF" && dayEvents.length > 0) return "moderate";
  return "busy"; // DAY or NIGHT shift
}
