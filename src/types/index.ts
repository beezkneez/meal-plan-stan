export type ShiftType = "DAY" | "NIGHT" | "OFF";

export interface ScheduleDay {
  day: number; // 0-15
  shift: ShiftType;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type BusynessLevel = "free" | "moderate" | "busy";

export interface ScrapedRecipe {
  title: string;
  sourceUrl: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
}

export interface RecipeIngredient {
  name: string;
  qty: number | null;
  unit: string;
  section?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  section: string;
  checked: boolean;
}
