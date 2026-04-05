"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RefreshCw, LinkIcon, ChefHat, Utensils } from "lucide-react";
import { format } from "date-fns";

interface MealSlotData {
  id: string;
  date: string;
  mealType: string;
  recipeId: string | null;
  servings: number;
  isLeftover: boolean;
  notes: string | null;
  recipe: {
    id: string;
    title: string;
    totalMinutes: number;
    proteinG: number | null;
    imageUrl: string | null;
  } | null;
}

interface MealPlanData {
  id: string;
  startDate: string;
  endDate: string;
  slots: MealSlotData[];
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: "border-l-amber-warm",
  lunch: "border-l-sage",
  dinner: "border-l-terracotta",
};

export function MealPlanGrid() {
  const [plan, setPlan] = useState<MealPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetch("/api/meal-plan")
      .then((r) => r.json())
      .then((data) => setPlan(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          days: 16,
          householdSize: 4,
          leftoverWorkMeals: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading meal plan...
      </div>
    );
  }

  const slotsByDate = new Map<string, MealSlotData[]>();
  if (plan?.slots) {
    for (const slot of plan.slots) {
      const dateKey = slot.date.split("T")[0];
      if (!slotsByDate.has(dateKey)) slotsByDate.set(dateKey, []);
      slotsByDate.get(dateKey)!.push(slot);
    }
  }

  const dates = plan ? [...slotsByDate.keys()].sort() : [];
  const mealTypes = ["breakfast", "lunch", "dinner"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-52"
        />
        <Button onClick={generatePlan} disabled={generating}>
          <RefreshCw
            className={cn("h-4 w-4 mr-2", generating && "animate-spin")}
          />
          {generating ? "Generating..." : "Generate 16-Day Plan"}
        </Button>
      </div>

      {!plan ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-14 text-center">
            <div className="relative mx-auto mb-4 h-16 w-16">
              <ChefHat className="h-16 w-16 text-muted-foreground/20" />
              <Utensils className="absolute -bottom-1 -right-1 h-7 w-7 text-primary/40" />
            </div>
            <p className="font-display text-lg font-semibold">
              No meal plan yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Set your schedule and add some recipes first, then generate a plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5 pb-2">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(dates.length, 8)}, minmax(170px, 1fr))`,
            }}
          >
            {dates.map((dateStr) => {
              const daySlots = slotsByDate.get(dateStr) ?? [];
              const dateObj = new Date(dateStr + "T12:00:00");
              return (
                <Card
                  key={dateStr}
                  className="min-w-[170px] border-border/60 overflow-hidden"
                >
                  <CardHeader className="bg-muted/40 py-2.5 px-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {format(dateObj, "EEE, MMM d")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-2 space-y-2">
                    {mealTypes.map((type) => {
                      const slot = daySlots.find((s) => s.mealType === type);
                      if (!slot) return null;

                      return (
                        <div
                          key={type}
                          className={cn(
                            "rounded-lg border border-border/50 border-l-[3px] p-2.5 text-xs transition-colors",
                            MEAL_COLORS[type],
                            slot.isLeftover
                              ? "bg-muted/30 border-dashed border-l-solid"
                              : "bg-card hover:bg-accent/20"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-semibold capitalize text-muted-foreground text-[10px] uppercase tracking-wider">
                              {type}
                            </span>
                            {slot.isLeftover && (
                              <LinkIcon className="h-3 w-3 text-muted-foreground/50" />
                            )}
                          </div>
                          <p className="font-medium text-[13px] truncate">
                            {slot.recipe?.title ?? slot.notes ?? "Unassigned"}
                          </p>
                          <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <span>{slot.servings} srv</span>
                            {slot.recipe?.proteinG && (
                              <span className="text-terracotta">
                                {slot.recipe.proteinG}g P
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
