"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Flame,
  Users,
  ExternalLink,
  ArrowLeft,
  ChefHat,
  Beef,
  Wheat,
  Droplets,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RecipeIngredient } from "@/types";

interface RecipeData {
  id: string;
  title: string;
  sourceUrl?: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  ingredients: string;
  steps: string;
  tags: string;
  isQuick: boolean;
  isSlowCook: boolean;
  leftoverFriendly: boolean;
}

export function RecipeView({ id }: { id: string }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading recipe...
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="py-12 text-center">
        <ChefHat className="h-14 w-14 mx-auto mb-4 text-muted-foreground/20" />
        <p className="font-display text-lg font-semibold">Recipe not found</p>
        <Link href="/recipes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to recipes
          </Button>
        </Link>
      </div>
    );
  }

  const ingredients: RecipeIngredient[] = JSON.parse(recipe.ingredients);
  const steps: string[] = JSON.parse(recipe.steps);
  const tags: string[] = JSON.parse(recipe.tags);

  function toggleIngredient(index: number) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const macros = [
    recipe.calories != null && {
      label: "Calories",
      value: recipe.calories,
      unit: "kcal",
      icon: Flame,
      color: "text-amber-warm",
    },
    recipe.proteinG != null && {
      label: "Protein",
      value: recipe.proteinG,
      unit: "g",
      icon: Beef,
      color: "text-terracotta",
    },
    recipe.carbsG != null && {
      label: "Carbs",
      value: recipe.carbsG,
      unit: "g",
      icon: Wheat,
      color: "text-amber-deep",
    },
    recipe.fatG != null && {
      label: "Fat",
      value: recipe.fatG,
      unit: "g",
      icon: Droplets,
      color: "text-indigo-shift",
    },
  ].filter(Boolean) as {
    label: string;
    value: number;
    unit: string;
    icon: typeof Flame;
    color: string;
  }[];

  // Group ingredients by section
  const sections = new Map<string, { ing: RecipeIngredient; idx: number }[]>();
  ingredients.forEach((ing, idx) => {
    const section = ing.section ?? "Ingredients";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push({ ing, idx });
  });

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to recipes
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        {recipe.imageUrl ? (
          <div className="relative h-64 md:h-80">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                {recipe.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 via-accent/30 to-secondary p-8 md:p-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              {recipe.title}
            </h1>
          </div>
        )}
      </div>

      {/* Quick info bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {recipe.totalMinutes > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="font-semibold">{recipe.totalMinutes} min</span>
              {recipe.prepMinutes > 0 && recipe.cookMinutes > 0 && (
                <span className="text-muted-foreground ml-1.5 text-xs">
                  ({recipe.prepMinutes} prep + {recipe.cookMinutes} cook)
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{recipe.servings} servings</span>
        </div>
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Original recipe
          </a>
        )}
      </div>

      {/* Tags */}
      {(tags.length > 0 || recipe.isQuick || recipe.isSlowCook || recipe.leftoverFriendly) && (
        <div className="flex flex-wrap gap-2">
          {recipe.isQuick && (
            <Badge className="bg-sage/15 text-sage border-sage/25 font-medium">
              Quick
            </Badge>
          )}
          {recipe.isSlowCook && (
            <Badge className="bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25 font-medium">
              Slow Cooker
            </Badge>
          )}
          {recipe.leftoverFriendly && (
            <Badge className="bg-amber-warm/15 text-amber-deep border-amber-warm/25 font-medium">
              Leftover Friendly
            </Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Macros */}
      {macros.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {macros.map((macro) => {
            const Icon = macro.icon;
            return (
              <Card key={macro.label} className="border-border/60">
                <CardContent className="p-4 text-center">
                  <Icon
                    className={cn("h-5 w-5 mx-auto mb-1.5", macro.color)}
                  />
                  <p className="text-2xl font-bold tabular-nums">
                    {macro.value}
                    <span className="text-sm font-normal text-muted-foreground ml-0.5">
                      {macro.unit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {macro.label}
                    <span className="opacity-60"> / serving</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main content: ingredients + steps */}
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        {/* Ingredients */}
        <div>
          <Card className="border-border/60 overflow-hidden lg:sticky lg:top-8">
            <div className="bg-gradient-to-r from-accent/40 to-transparent px-5 py-4">
              <h2 className="font-display text-lg font-bold">Ingredients</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ingredients.length} items &middot; Tap to check off
              </p>
            </div>
            <CardContent className="p-0">
              {[...sections.entries()].map(([section, items]) => (
                <div key={section}>
                  {sections.size > 1 && (
                    <div className="px-5 pt-4 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section}
                      </p>
                    </div>
                  )}
                  <div className="divide-y divide-border/30">
                    {items.map(({ ing, idx }) => {
                      const checked = checkedIngredients.has(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleIngredient(idx)}
                          className={cn(
                            "flex items-center gap-3 w-full px-5 py-3 text-left text-sm transition-all duration-150",
                            checked
                              ? "text-muted-foreground/40 bg-muted/20"
                              : "hover:bg-accent/20"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                              checked
                                ? "bg-primary border-primary"
                                : "border-border"
                            )}
                          >
                            {checked && (
                              <svg
                                className="h-3 w-3 text-primary-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={cn(
                              "flex-1 transition-all",
                              checked && "line-through"
                            )}
                          >
                            {ing.qty != null && (
                              <span className="font-semibold">
                                {ing.qty}{" "}
                              </span>
                            )}
                            {ing.unit && (
                              <span className="text-muted-foreground">
                                {ing.unit}{" "}
                              </span>
                            )}
                            {ing.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Steps */}
        <div>
          <h2 className="font-display text-lg font-bold mb-5">Instructions</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
