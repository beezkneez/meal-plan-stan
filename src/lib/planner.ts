import { differenceInDays } from "date-fns";
import type {
  ShiftType,
  ScheduleDay,
  BusynessLevel,
  CalendarEvent,
} from "@/types";

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
  mealTypes: string[];
}

interface PlannedSlot {
  date: string;
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
  lunchDays: number[]; // 0=Sun, 1=Mon, etc.
  includeBreakfast: boolean;
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
    lunchDays,
    includeBreakfast,
  } = input;

  const slots: PlannedSlot[] = [];
  const recentlyUsed = new Map<string, number>();

  // Split recipes by meal type
  const dinnerRecipes = recipes.filter((r) => r.mealTypes.includes("dinner"));
  const lunchRecipes = recipes.filter((r) => r.mealTypes.includes("lunch"));
  const breakfastRecipes = recipes.filter((r) =>
    r.mealTypes.includes("breakfast")
  );

  // Fallback: if user only has "dinner" tagged recipes, use them for lunch too
  const lunchCandidates =
    lunchRecipes.length > 0
      ? lunchRecipes
      : dinnerRecipes.filter((r) => r.isQuick);

  const defaultBreakfasts = [
    "Eggs & Toast",
    "Oatmeal & Fruit",
    "Protein Smoothie",
    "Greek Yogurt Bowl",
    "Pancakes",
    "Breakfast Wrap",
  ];

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay(); // 0=Sun

    const shift = getShiftForDate(date, anchorDate, schedule);
    const busyness = classifyBusyness(shift, input.calendarEvents, date);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextShift =
      d < days - 1
        ? getShiftForDate(nextDate, anchorDate, schedule)
        : "OFF";
    const tomorrowIsWork = nextShift === "DAY" || nextShift === "NIGHT";

    // === BREAKFAST ===
    if (includeBreakfast) {
      if (breakfastRecipes.length > 0) {
        const br = pickRecipe(breakfastRecipes, "free", recentlyUsed, d, 0);
        slots.push({
          date: dateStr,
          mealType: "breakfast",
          recipeId: br?.id ?? null,
          recipeTitle: br?.title ?? defaultBreakfasts[d % defaultBreakfasts.length],
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
    }

    // === DINNER ===
    const dinnerRecipe = pickRecipe(
      dinnerRecipes,
      busyness,
      recentlyUsed,
      d,
      targetProteinPerDay
    );

    // Make extra servings for leftovers if tomorrow is a work day
    const makingLeftovers =
      leftoverWorkMeals &&
      tomorrowIsWork &&
      dinnerRecipe?.leftoverFriendly;

    const dinnerServings = makingLeftovers
      ? householdSize + 2 // extra for packed lunch
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
      notes:
        busyness === "busy"
          ? "Work day — quick or prepped meal"
          : busyness === "moderate"
            ? "Busy day — keep it simple"
            : makingLeftovers
              ? "Making extra for leftovers"
              : undefined,
    });

    // === LUNCH ===
    const isWorkDay = shift === "DAY" || shift === "NIGHT";
    const wantsLunch = lunchDays.includes(dayOfWeek) || isWorkDay;

    if (!wantsLunch) continue;

    // Check yesterday's dinner for leftover opportunity
    const yesterdayDinner = slots.find((s) => {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      return (
        s.date === yesterday.toISOString().split("T")[0] &&
        s.mealType === "dinner" &&
        !s.isLeftover &&
        s.servings > householdSize
      );
    });

    if (yesterdayDinner && isWorkDay) {
      // Use leftovers for work lunch
      slots.push({
        date: dateStr,
        mealType: "lunch",
        recipeId: yesterdayDinner.recipeId,
        recipeTitle: `Leftover: ${yesterdayDinner.recipeTitle}`,
        servings: 1,
        isLeftover: true,
        leftoverSourceDate: yesterdayDinner.date,
        notes: "Packed for work",
      });
    } else if (lunchCandidates.length > 0) {
      // Pick a lunch recipe
      const lunchRecipe = pickRecipe(
        lunchCandidates,
        busyness,
        recentlyUsed,
        d,
        targetProteinPerDay
      );
      if (lunchRecipe) {
        recentlyUsed.set(lunchRecipe.id, d);
      }
      slots.push({
        date: dateStr,
        mealType: "lunch",
        recipeId: lunchRecipe?.id ?? null,
        recipeTitle: lunchRecipe?.title ?? "Light lunch",
        servings: isWorkDay ? 1 : householdSize,
        isLeftover: false,
        notes: isWorkDay ? "Pack for work" : undefined,
      });
    } else {
      slots.push({
        date: dateStr,
        mealType: "lunch",
        recipeId: null,
        recipeTitle: "Light lunch / salad",
        servings: isWorkDay ? 1 : householdSize,
        isLeftover: false,
        notes: isWorkDay ? "Pack for work" : undefined,
      });
    }
  }

  return slots;
}

function pickRecipe(
  recipes: PlannerRecipe[],
  busyness: BusynessLevel,
  recentlyUsed: Map<string, number>,
  currentDay: number,
  targetProtein: number
): PlannerRecipe | null {
  if (recipes.length === 0) return null;

  // Filter by time budget for busy days
  let candidates = recipes;
  if (busyness === "busy") {
    const quickOrSlow = recipes.filter((r) => r.isQuick || r.isSlowCook);
    if (quickOrSlow.length > 0) candidates = quickOrSlow;
  } else if (busyness === "moderate") {
    const under45 = recipes.filter(
      (r) => r.totalMinutes <= 45 || r.isSlowCook
    );
    if (under45.length > 0) candidates = under45;
  }

  // Score each candidate
  const scored = candidates.map((recipe) => {
    const daysSinceUsed = recentlyUsed.has(recipe.id)
      ? currentDay - recentlyUsed.get(recipe.id)!
      : 16; // never used = max variety

    // Heavily penalize recently used recipes
    const varietyScore = daysSinceUsed <= 1 ? 0 : Math.min(daysSinceUsed / 8, 1);

    const proteinScore =
      recipe.proteinG != null && targetProtein > 0
        ? Math.min(recipe.proteinG / (targetProtein / 3), 1)
        : 0.5;

    const leftoverScore = recipe.leftoverFriendly ? 1 : 0.7;

    const quickScore =
      busyness === "busy" && (recipe.isQuick || recipe.isSlowCook) ? 1 : 0.7;

    const score =
      varietyScore * 0.4 +
      proteinScore * 0.25 +
      leftoverScore * 0.2 +
      quickScore * 0.15;

    return { recipe, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Weighted random from top candidates (more variety)
  const topCount = Math.min(4, scored.length);
  const top = scored.slice(0, topCount);
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

  // Check for evening events (after 4pm) - these make dinner time tight
  const eveningEvents = dayEvents.filter((e) => {
    if (!e.start.includes("T")) return false; // all-day events don't count
    const hour = parseInt(e.start.split("T")[1]?.split(":")[0] ?? "0", 10);
    return hour >= 16;
  });

  // Work shifts are always busy
  if (shift === "DAY" || shift === "NIGHT") return "busy";

  // Off day with evening activities (sports, appointments) = moderate
  if (eveningEvents.length > 0) return "moderate";

  // Off day with lots of events = moderate
  if (dayEvents.length >= 2) return "moderate";

  return "free";
}
