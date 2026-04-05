"use client";

import { MealPlanGrid } from "@/components/meal-plan-grid";

export default function MealPlanPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Meal Plan
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your 16-day meal plan, built around your schedule.
        </p>
      </div>
      <MealPlanGrid />
    </div>
  );
}
