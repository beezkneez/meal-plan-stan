"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  LinkIcon,
  ChefHat,
  Utensils,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShoppingCart,
  Pencil,
  Check,
  Search,
  X,
  Plus,
} from "lucide-react";
// Using inline modal instead of Dialog to avoid Base UI compatibility issues
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MealPlanGrid() {
  const [plan, setPlan] = useState<MealPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder settings
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [ownRecipeRatio, setOwnRecipeRatio] = useState(60);
  const [lunchDays, setLunchDays] = useState<number[]>([0, 6]);
  const [includBreakfast, setIncludeBreakfast] = useState(true);
  const [recipeCount, setRecipeCount] = useState<number | null>(null);
  const router = useRouter();

  // Slot editor
  const [editingSlot, setEditingSlot] = useState<MealSlotData | null>(null);
  const [editMode, setEditMode] = useState<"custom" | "recipe">("custom");
  const [customText, setCustomText] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [userRecipes, setUserRecipes] = useState<{ id: string; title: string; imageUrl: string | null }[]>([]);
  const [savingSlot, setSavingSlot] = useState(false);

  // Serving settings
  const [householdSize, setHouseholdSize] = useState(3); // full family
  const [workDayHeadcount, setWorkDayHeadcount] = useState(2); // who eats when you're working
  const [leftoverMode, setLeftoverMode] = useState(true); // make extra dinner for next day lunch
  const [leftoverPortions, setLeftoverPortions] = useState(3); // how many leftover portions
  const [easyWorkNightMeals, setEasyWorkNightMeals] = useState(true); // pick easy meals on work nights

  useEffect(() => {
    fetch("/api/meal-plan")
      .then((r) => r.json())
      .then((data) => setPlan(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipeCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  function toggleLunchDay(dayIndex: number) {
    setLunchDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  }

  // Delete/skip slot
  const [deleteSlot, setDeleteSlot] = useState<MealSlotData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Add manual entry
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
  const [addMealType, setAddMealType] = useState("dinner");
  const [addNotes, setAddNotes] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  async function handleDeleteSlot() {
    if (!deleteSlot) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/meal-plan/slot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: deleteSlot.id, reason: deleteReason }),
      });
      if (res.ok) {
        const { removedSlotIds } = await res.json();
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            slots: prev.slots
              .filter((s) => !removedSlotIds.includes(s.id) || s.id === deleteSlot.id)
              .map((s) =>
                s.id === deleteSlot.id
                  ? { ...s, recipeId: null, recipe: null, notes: deleteReason ? `Skipped: ${deleteReason}` : "Skipped", servings: 0, isLeftover: false }
                  : s
              ),
          };
        });
        setDeleteSlot(null);
        setDeleteReason("");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddSlot() {
    if (!plan || !addingToDate) return;
    setAddingSaving(true);
    try {
      const res = await fetch("/api/meal-plan/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealPlanId: plan.id,
          date: addingToDate,
          mealType: addMealType,
          notes: addNotes,
        }),
      });
      if (res.ok) {
        const newSlot = await res.json();
        setPlan((prev) => {
          if (!prev) return prev;
          return { ...prev, slots: [...prev.slots, newSlot] };
        });
        setAddingToDate(null);
        setAddNotes("");
      }
    } finally {
      setAddingSaving(false);
    }
  }

  async function updateSlotServings(slotId: string, newServings: number) {
    if (newServings < 1) return;
    // Optimistic update
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) =>
          s.id === slotId ? { ...s, servings: newServings } : s
        ),
      };
    });
    await fetch("/api/meal-plan/slot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, servings: newServings }),
    });
  }

  function openSlotEditor(slot: MealSlotData) {
    setEditingSlot(slot);
    setCustomText(slot.notes ?? slot.recipe?.title ?? "");
    setEditMode(slot.recipe ? "recipe" : "custom");
    setRecipeSearch("");
    // Load recipes for picker
    if (userRecipes.length === 0) {
      fetch("/api/recipes")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setUserRecipes(data.map((r: { id: string; title: string; imageUrl: string | null }) => ({
              id: r.id,
              title: r.title,
              imageUrl: r.imageUrl,
            })));
          }
        })
        .catch(() => {});
    }
  }

  async function saveSlotCustom() {
    if (!editingSlot) return;
    setSavingSlot(true);
    try {
      const res = await fetch("/api/meal-plan/slot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: editingSlot.id,
          recipeId: null,
          notes: customText,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            slots: prev.slots.map((s) =>
              s.id === editingSlot.id
                ? { ...s, recipeId: null, recipe: null, notes: customText, isLeftover: false }
                : s
            ),
          };
        });
        setEditingSlot(null);
      }
    } finally {
      setSavingSlot(false);
    }
  }

  async function saveSlotRecipe(recipeId: string) {
    if (!editingSlot) return;
    setSavingSlot(true);
    try {
      const res = await fetch("/api/meal-plan/slot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: editingSlot.id,
          recipeId,
          notes: null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            slots: prev.slots.map((s) =>
              s.id === editingSlot.id
                ? { ...s, recipeId: updated.recipeId, recipe: updated.recipe, notes: null, isLeftover: false }
                : s
            ),
          };
        });
        setEditingSlot(null);
      }
    } finally {
      setSavingSlot(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          days: 16,
          householdSize,
          householdSizeWorkDay: workDayHeadcount,
          leftoverWorkMeals: leftoverMode,
          leftoverServings: leftoverPortions,
          easyWorkNightMeals,
          ownRecipeRatio,
          lunchDays,
          includeBreakfast: includBreakfast,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
        setShowBuilder(false);
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
    <div className="space-y-6">
      {/* Builder toggle */}
      <Button
        variant={showBuilder ? "default" : "outline"}
        onClick={() => setShowBuilder(!showBuilder)}
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        {showBuilder ? "Hide Builder" : "Build a Meal Plan"}
      </Button>

      {/* Builder panel */}
      {showBuilder && (
        <Card className="border-border/60 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-xl">
                Plan Builder
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure your 16-day meal plan. Stan will use your schedule,
              preferences, and calendar to build it.
            </p>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            {/* Recipe count warning */}
            {recipeCount !== null && recipeCount < 10 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-warm/40 bg-amber-warm/10 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-deep shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    You only have {recipeCount} recipe{recipeCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For good variety, aim for 10-15+ recipes.
                  </p>
                  <Link href="/discover">
                    <Button variant="outline" size="sm" className="mt-2">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Discover Recipes
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Start date */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-52 mt-1"
              />
            </div>

            {/* ── Household & Servings ── */}
            <div className="rounded-xl border border-border/60 p-4 space-y-4">
              <p className="text-sm font-semibold">Household & Servings</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Family size (days off)</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(Number(e.target.value))}
                    className="w-20 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Eating at home on work nights</label>
                  <p className="text-[11px] text-muted-foreground">e.g. partner + kids</p>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={workDayHeadcount}
                    onChange={(e) => setWorkDayHeadcount(Number(e.target.value))}
                    className="w-20 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* ── Leftovers ── */}
            <div className="rounded-xl border border-border/60 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Leftovers</p>
                <button
                  onClick={() => setLeftoverMode(!leftoverMode)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-1 text-xs font-medium transition-all",
                    leftoverMode
                      ? "border-sage bg-sage/10 text-sage"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  {leftoverMode ? "On" : "Off"}
                </button>
              </div>

              {leftoverMode && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Dinner will make extra portions so you have leftovers for
                    lunch the next day. No separate lunch recipe needed.
                  </p>
                  <div>
                    <label className="text-xs font-medium">
                      Extra leftover portions
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      How many packed lunches for the next day?
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={8}
                      value={leftoverPortions}
                      onChange={(e) => setLeftoverPortions(Number(e.target.value))}
                      className="w-20 mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Work night dinner = {workDayHeadcount} eating + {leftoverPortions} leftover ={" "}
                      <span className="font-semibold text-foreground">{workDayHeadcount + leftoverPortions} servings</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Off day dinner = {householdSize} eating + {leftoverPortions} leftover ={" "}
                      <span className="font-semibold text-foreground">{householdSize + leftoverPortions} servings</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Work Night Meals ── */}
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <p className="text-sm font-semibold">Work Night Meals</p>
              <p className="text-xs text-muted-foreground">
                When you&apos;re on shift, pick easy meals your partner can make
                quickly for the kids.
              </p>
              <button
                onClick={() => setEasyWorkNightMeals(!easyWorkNightMeals)}
                className={cn(
                  "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  easyWorkNightMeals
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                Prefer easy/quick meals on work nights
              </button>
            </div>

            {/* ── Meals to include ── */}
            <div className="rounded-xl border border-border/60 p-4 space-y-4">
              <p className="text-sm font-semibold">Meals to Plan</p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIncludeBreakfast(!includBreakfast)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    includBreakfast
                      ? "border-amber-warm bg-amber-warm/10 text-amber-deep"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  Breakfast
                </button>
              </div>

              <div>
                <label className="text-xs font-medium">Plan lunch on these days</label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {leftoverMode
                    ? "Work day lunches are covered by leftovers. Pick extra days you want a fresh lunch."
                    : "Which days do you want lunch planned?"}
                </p>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleLunchDay(i)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border-2 text-xs font-semibold transition-all duration-200",
                        lunchDays.includes(i)
                          ? "border-sage bg-sage/10 text-sage"
                          : "border-border/60 text-muted-foreground hover:border-sage/30"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipe ratio slider */}
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <p className="text-sm font-semibold">Recipe Mix</p>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={ownRecipeRatio}
                onChange={(e) => setOwnRecipeRatio(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs">
                <span className={cn("font-medium", ownRecipeRatio >= 50 ? "text-primary" : "text-muted-foreground")}>
                  {ownRecipeRatio}% Your recipes
                </span>
                <span className={cn("font-medium", ownRecipeRatio < 50 ? "text-terracotta" : "text-muted-foreground")}>
                  {100 - ownRecipeRatio}% New suggestions
                </span>
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={generatePlan}
              disabled={generating}
              size="lg"
              className="w-full sm:w-auto"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", generating && "animate-spin")}
              />
              {generating ? "Generating..." : "Generate 16-Day Plan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing plan display */}
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
              Click &ldquo;Build a Meal Plan&rdquo; above to configure and
              generate your first plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {plan.slots.length} meals planned &middot;{" "}
            {format(new Date(plan.startDate), "MMM d")} &ndash;{" "}
            {format(new Date(plan.endDate), "MMM d")}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/shopping-list")}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Shopping List
          </Button>
        </div>
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
                      const typeSlots = daySlots.filter((s) => s.mealType === type);
                      if (typeSlots.length === 0) return null;

                      // Single slot (complete meal or leftover)
                      if (typeSlots.length === 1) {
                        const slot = typeSlots[0];
                        return (
                          <div
                            key={type}
                            onClick={() => openSlotEditor(slot)}
                            className={cn(
                              "rounded-lg border border-border/50 border-l-[3px] p-2.5 text-xs transition-colors cursor-pointer group/slot",
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
                              <span className="ml-auto flex gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteSlot(slot); }}
                                  className="hover:text-destructive transition-colors"
                                >
                                  <X className="h-3 w-3 text-muted-foreground/40 hover:text-destructive" />
                                </button>
                              </span>
                            </div>
                            {slot.recipe ? (
                              <Link
                                href={`/recipes/${slot.recipe.id}`}
                                className="font-medium text-[13px] truncate block hover:text-primary transition-colors"
                              >
                                {slot.recipe.title}
                              </Link>
                            ) : (
                              <p className="font-medium text-[13px] truncate">
                                {slot.notes ?? "Unassigned"}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => updateSlotServings(slot.id, slot.servings - 1)}
                                  className="flex h-4 w-4 items-center justify-center rounded border border-border/60 text-[8px] hover:bg-accent transition-colors"
                                >
                                  -
                                </button>
                                <span className="min-w-[2ch] text-center tabular-nums">{slot.servings}</span>
                                <button
                                  onClick={() => updateSlotServings(slot.id, slot.servings + 1)}
                                  className="flex h-4 w-4 items-center justify-center rounded border border-border/60 text-[8px] hover:bg-accent transition-colors"
                                >
                                  +
                                </button>
                                <span className="text-[10px]">srv</span>
                              </div>
                              {slot.recipe?.proteinG && (
                                <span className="text-terracotta">
                                  {slot.recipe.proteinG}g P
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Multiple slots = composed meal (main + side + veggie)
                      return (
                        <div
                          key={type}
                          className={cn(
                            "rounded-lg border border-border/50 border-l-[3px] p-2.5 text-xs",
                            MEAL_COLORS[type],
                            "bg-card"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="font-semibold capitalize text-muted-foreground text-[10px] uppercase tracking-wider">
                              {type}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {typeSlots.map((slot, i) => (
                              <div key={slot.id} className="flex items-baseline gap-1.5">
                                <span className="text-muted-foreground/40 text-[10px]">
                                  {i === 0 ? "\u2022" : "+"}
                                </span>
                                {slot.recipe ? (
                                  <Link
                                    href={`/recipes/${slot.recipe.id}`}
                                    className="font-medium text-[12px] truncate flex-1 hover:text-primary transition-colors"
                                  >
                                    {slot.recipe.title}
                                  </Link>
                                ) : (
                                  <p className="font-medium text-[12px] truncate flex-1">
                                    {slot.notes ?? "Unassigned"}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mt-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  typeSlots.forEach((s) => updateSlotServings(s.id, Math.max(1, s.servings - 1)));
                                }}
                                className="flex h-4 w-4 items-center justify-center rounded border border-border/60 text-[8px] hover:bg-accent transition-colors"
                              >
                                -
                              </button>
                              <span className="min-w-[2ch] text-center tabular-nums">{typeSlots[0].servings}</span>
                              <button
                                onClick={() => {
                                  typeSlots.forEach((s) => updateSlotServings(s.id, s.servings + 1));
                                }}
                                className="flex h-4 w-4 items-center justify-center rounded border border-border/60 text-[8px] hover:bg-accent transition-colors"
                              >
                                +
                              </button>
                              <span className="text-[10px]">srv</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Add slot button */}
                    <button
                      onClick={() => {
                        setAddingToDate(dateStr);
                        setAddMealType("dinner");
                        setAddNotes("");
                      }}
                      className="flex items-center justify-center gap-1 w-full rounded-lg border border-dashed border-border/40 py-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:border-primary/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        </div>
      )}
      {/* Slot editor modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setEditingSlot(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto rounded-xl bg-popover p-5 shadow-xl ring-1 ring-foreground/10 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Edit {editingSlot.mealType} — {format(new Date(editingSlot.date.split("T")[0] + "T12:00:00"), "EEE, MMM d")}
              </h3>
            </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode("custom")}
              className={cn(
                "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                editMode === "custom"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              Type custom
            </button>
            <button
              onClick={() => setEditMode("recipe")}
              className={cn(
                "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                editMode === "recipe"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              Pick a recipe
            </button>
          </div>

          {editMode === "custom" ? (
            <div className="space-y-3">
              <Input
                placeholder="e.g. Bagel and yogurt parfait"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSlotCustom()}
                autoFocus
              />
              <Button
                onClick={saveSlotCustom}
                disabled={savingSlot || !customText.trim()}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                {savingSlot ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search your recipes..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {userRecipes
                  .filter((r) =>
                    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
                  )
                  .map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => saveSlotRecipe(recipe.id)}
                      disabled={savingSlot}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent/30 transition-colors"
                    >
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt=""
                          className="h-8 w-8 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ChefHat className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <span className="font-medium truncate">{recipe.title}</span>
                    </button>
                  ))}
                {userRecipes.filter((r) =>
                  r.title.toLowerCase().includes(recipeSearch.toLowerCase())
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recipes found
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Delete/skip slot modal */}
      {deleteSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setDeleteSlot(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-popover p-5 shadow-xl ring-1 ring-foreground/10 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              Skip {deleteSlot.mealType}?
            </h3>
            <p className="text-sm text-muted-foreground">
              {deleteSlot.recipe?.title ?? deleteSlot.notes ?? "This meal"} on{" "}
              {format(new Date(deleteSlot.date.split("T")[0] + "T12:00:00"), "EEE, MMM d")}
            </p>
            {deleteSlot.mealType === "dinner" && (
              <p className="text-xs text-amber-deep">
                This will also remove tomorrow&apos;s leftover lunch if it depends on this dinner.
              </p>
            )}
            <Input
              placeholder="Reason (e.g. Going to a friend's place)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteSlot}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? "Removing..." : "Skip This Meal"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteSlot(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add manual entry modal */}
      {addingToDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setAddingToDate(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-popover p-5 shadow-xl ring-1 ring-foreground/10 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              Add to {format(new Date(addingToDate.split("T")[0] + "T12:00:00"), "EEE, MMM d")}
            </h3>
            <div className="flex gap-2">
              {["breakfast", "lunch", "dinner", "snack"].map((mt) => (
                <button
                  key={mt}
                  onClick={() => setAddMealType(mt)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    addMealType === mt
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  {mt}
                </button>
              ))}
            </div>
            <Input
              placeholder="e.g. Going to McDonald's, Date night out"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNotes.trim() && handleAddSlot()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddSlot}
                disabled={addingSaving || !addNotes.trim()}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingSaving ? "Adding..." : "Add"}
              </Button>
              <Button variant="outline" onClick={() => setAddingToDate(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
