"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  Sparkles,
  Clock,
  Flame,
  Check,
  X,
  ChefHat,
  Globe,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DiscoveredRecipe {
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  ingredients: { name: string; qty: number | null; unit: string }[];
  steps: string[];
  tags: string[];
  mealTypes: string[];
  source: "spoonacular" | "ai" | "hellofresh";
}

const MEAL_TYPE_FILTERS = [
  { value: "any", label: "Any" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const QUICK_SEARCHES = [
  "easy chicken dinner",
  "30 minute meals",
  "slow cooker recipes",
  "high protein lunch",
  "kid friendly dinner",
  "meal prep",
  "sheet pan dinner",
  "one pot pasta",
  "healthy breakfast",
  "budget friendly",
];

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  lunch: "bg-sage/15 text-sage border-sage/25",
  dinner: "bg-terracotta/15 text-terracotta border-terracotta/25",
  snack: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
};

export function RecipeDiscovery() {
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState("any");
  const [recipes, setRecipes] = useState<DiscoveredRecipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [source, setSource] = useState("both");

  async function search(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;

    setSearching(true);
    setApproved(new Set());
    setDismissed(new Set());
    setPage(0);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        mealType,
        source,
        offset: "0",
      });
      const res = await fetch(`/api/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes ?? []);
      }
    } finally {
      setSearching(false);
    }
  }

  async function loadMore() {
    const searchQuery = query;
    if (!searchQuery.trim()) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        mealType,
        source,
        offset: String(nextPage * 10),
      });
      const res = await fetch(`/api/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newRecipes = data.recipes ?? [];
        if (newRecipes.length > 0) {
          setRecipes((prev) => [...prev, ...newRecipes]);
          setPage(nextPage);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function approveRecipe(index: number) {
    const recipe = recipes[index];
    setSaving(index);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });

      if (res.ok) {
        setApproved((prev) => new Set([...prev, index]));
      }
    } finally {
      setSaving(null);
    }
  }

  function dismissRecipe(index: number) {
    setDismissed((prev) => new Set([...prev, index]));
  }

  const visibleRecipes = recipes.filter(
    (_, i) => !dismissed.has(i)
  );

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="pl-9"
          />
        </div>
        <Button onClick={() => search()} disabled={searching || !query.trim()}>
          {searching ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Discover
            </>
          )}
        </Button>
      </div>

      {/* Meal type filter */}
      <div className="flex flex-wrap gap-2">
        {MEAL_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMealType(f.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
              mealType === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Source filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "both", label: "All Sources" },
          { value: "spoonacular", label: "Web Recipes" },
          { value: "ai", label: "AI Generated" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setSource(s.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
              source === s.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/30"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Quick searches */}
      {recipes.length === 0 && !searching && (
        <div>
          <p className="text-sm font-medium mb-3">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  search(q);
                }}
                className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all duration-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Finding recipes from the web and AI...
        </div>
      )}

      {/* Results */}
      {!searching && visibleRecipes.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {visibleRecipes.length} recipe{visibleRecipes.length !== 1 ? "s" : ""} found.
            Approve the ones you like to add them to your recipe book.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe, index) => {
              if (dismissed.has(index)) return null;
              const isApproved = approved.has(index);
              const isSaving = saving === index;

              return (
                <Card
                  key={index}
                  className={cn(
                    "group overflow-hidden border-border/60 transition-all duration-300",
                    isApproved && "ring-2 ring-sage border-sage/40"
                  )}
                >
                  {/* Image */}
                  {recipe.imageUrl ? (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {/* Source badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          className={cn(
                            "text-[10px] font-medium",
                            recipe.source === "ai"
                              ? "bg-indigo-shift/80 text-white"
                              : "bg-black/60 text-white"
                          )}
                        >
                          {recipe.source === "ai" ? (
                            <>
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </>
                          ) : (
                            <>
                              <Globe className="h-3 w-3 mr-1" />
                              Web
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-24 bg-gradient-to-br from-primary/10 via-accent/30 to-secondary flex items-center justify-center">
                      <ChefHat className="h-10 w-10 text-primary/30" />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-indigo-shift/80 text-white text-[10px] font-medium">
                          <Bot className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base leading-snug">
                      {recipe.title}
                    </CardTitle>
                    {recipe.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Quick stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {recipe.totalMinutes > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {recipe.totalMinutes}m
                        </span>
                      )}
                      {recipe.proteinG && (
                        <span className="flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-terracotta" />
                          {recipe.proteinG}g protein
                        </span>
                      )}
                      {recipe.calories && (
                        <span className="text-xs">{recipe.calories} cal</span>
                      )}
                    </div>

                    {/* Meal type + tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.mealTypes.map((mt) => (
                        <Badge
                          key={mt}
                          className={`text-xs font-medium capitalize ${MEAL_TYPE_COLORS[mt] ?? ""}`}
                        >
                          {mt}
                        </Badge>
                      ))}
                      {recipe.ingredients.length > 0 && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {recipe.ingredients.length} ingredients
                        </Badge>
                      )}
                    </div>

                    {/* View details toggle */}
                    <button
                      onClick={() => setExpanded(expanded === index ? null : index)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline w-full"
                    >
                      {expanded === index ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          View ingredients &amp; steps
                        </>
                      )}
                    </button>

                    {/* Expanded details */}
                    {expanded === index && (
                      <div className="space-y-3 border-t border-border/40 pt-3">
                        {recipe.ingredients.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Ingredients
                            </p>
                            <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/30 p-2.5 text-xs space-y-0.5">
                              {recipe.ingredients.map((ing, i) => (
                                <div key={i}>
                                  {ing.qty != null && (
                                    <span className="font-semibold">{ing.qty} </span>
                                  )}
                                  {ing.unit && (
                                    <span className="text-muted-foreground">{ing.unit} </span>
                                  )}
                                  {ing.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {recipe.steps.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Steps
                            </p>
                            <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/30 p-2.5 text-xs space-y-1.5">
                              {recipe.steps.map((step, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="font-semibold text-primary shrink-0">{i + 1}.</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {recipe.calories && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {recipe.calories && <span>{recipe.calories} cal</span>}
                            {recipe.proteinG && <span>{recipe.proteinG}g protein</span>}
                            {recipe.carbsG && <span>{recipe.carbsG}g carbs</span>}
                            {recipe.fatG && <span>{recipe.fatG}g fat</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      {isApproved ? (
                        <div className="flex items-center gap-2 text-sm font-medium text-sage">
                          <Check className="h-4 w-4" />
                          Added to recipe book
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveRecipe(index)}
                            disabled={isSaving}
                            className="flex-1"
                          >
                            {isSaving ? (
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {isSaving ? "Adding..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissRecipe(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Find More button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Finding more...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Find More Recipes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
