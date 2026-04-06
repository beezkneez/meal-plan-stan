"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Clock,
  Flame,
  Search,
  ExternalLink,
  Trash2,
  ChefHat,
  Eye,
  Star,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ScrapedRecipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  lunch: "bg-sage/15 text-sage border-sage/25",
  dinner: "bg-terracotta/15 text-terracotta border-terracotta/25",
  snack: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
};

const RECIPE_ROLES = [
  { value: "complete", label: "Complete Meal", desc: "Full meal, no sides needed" },
  { value: "main", label: "Main", desc: "Protein / main dish — needs sides" },
  { value: "side", label: "Side", desc: "Starch or grain side dish" },
  { value: "veggie", label: "Veggie", desc: "Vegetable side dish" },
  { value: "soup", label: "Soup", desc: "Soup or stew" },
  { value: "salad", label: "Salad", desc: "Salad or slaw" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  complete: "bg-primary/10 text-primary border-primary/20",
  main: "bg-terracotta/15 text-terracotta border-terracotta/25",
  side: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  veggie: "bg-sage/15 text-sage border-sage/25",
  soup: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
  salad: "bg-sage/15 text-sage border-sage/25",
};

interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  imageUrl?: string;
  totalMinutes: number;
  servings: number;
  calories?: number;
  proteinG?: number;
  tags: string;
  mealTypes: string;
  role: string;
  rating: number;
  isQuick: boolean;
}

export function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  async function loadRecipes() {
    const res = await fetch(`/api/recipes?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRecipes();
  }, [search]);

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  async function rateRecipe(id: string, rating: number) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating } : r))
    );
    await fetch(`/api/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Import Recipe from URL
              </DialogTitle>
            </DialogHeader>
            <RecipeImportForm
              onSaved={() => {
                setImportOpen(false);
                loadRecipes();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading recipes...
        </div>
      ) : recipes.length === 0 ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-14 text-center">
            <ChefHat className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-display text-lg font-semibold">
              No recipes yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &ldquo;Add Recipe&rdquo; to import from a URL.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const tags: string[] = JSON.parse(recipe.tags);
            const mealTypes: string[] = JSON.parse(recipe.mealTypes ?? '["dinner"]');
            return (
              <Card
                key={recipe.id}
                className="card-warm group overflow-hidden border-border/60"
              >
                <Link href={`/recipes/${recipe.id}`}>
                  {recipe.imageUrl && (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                  )}
                </Link>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/recipes/${recipe.id}`} className="flex-1 min-w-0">
                      <CardTitle className="font-display text-base leading-snug hover:text-primary transition-colors">
                        {recipe.title}
                      </CardTitle>
                    </Link>
                    <div className="flex shrink-0 gap-0.5">
                      <Link href={`/recipes/${recipe.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        onClick={() => deleteRecipe(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
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
                  {/* Star rating */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          rateRecipe(recipe.id, recipe.rating === star ? 0 : star);
                        }}
                        className="p-0"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            star <= recipe.rating
                              ? "fill-amber-warm text-amber-warm"
                              : "text-border hover:text-amber-warm/50"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      className={`text-xs font-medium capitalize ${ROLE_COLORS[recipe.role] ?? ROLE_COLORS.complete}`}
                    >
                      {recipe.role}
                    </Badge>
                    {mealTypes.map((mt) => (
                      <Badge
                        key={mt}
                        className={`text-xs font-medium capitalize ${MEAL_TYPE_COLORS[mt] ?? ""}`}
                      >
                        {mt}
                      </Badge>
                    ))}
                    {recipe.isQuick && (
                      <Badge className="bg-sage/20 text-sage border-sage/30 text-xs font-medium">
                        Quick
                      </Badge>
                    )}
                    {tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecipeImportForm({ onSaved }: { onSaved: () => void }) {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraped, setScraped] = useState<ScrapedRecipe | null>(null);
  const [error, setError] = useState("");
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["dinner"]);
  const [selectedRole, setSelectedRole] = useState("complete");
  const [originalServings, setOriginalServings] = useState<number | null>(null);

  async function handleScrape() {
    setError("");
    setScraping(true);
    try {
      const res = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to scrape");
        return;
      }
      const data = await res.json();
      setScraped(data);
      setOriginalServings(data.servings);
    } catch {
      setError("Network error");
    } finally {
      setScraping(false);
    }
  }

  async function handleSave() {
    if (!scraped) return;
    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scraped, mealTypes: selectedMealTypes, role: selectedRole }),
      });
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (!scraped) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Paste recipe URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <Button onClick={handleScrape} disabled={!url || scraping}>
            {scraping ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Scraping...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input
            value={scraped.title}
            onChange={(e) => setScraped({ ...scraped, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-sm font-medium">Prep (min)</label>
            <Input
              type="number"
              value={scraped.prepMinutes}
              onChange={(e) =>
                setScraped({ ...scraped, prepMinutes: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cook (min)</label>
            <Input
              type="number"
              value={scraped.cookMinutes}
              onChange={(e) =>
                setScraped({ ...scraped, cookMinutes: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Servings</label>
            <Input
              type="number"
              value={scraped.servings}
              onChange={(e) => {
                const newServings = Number(e.target.value);
                if (!newServings || newServings < 1 || !originalServings) {
                  setScraped({ ...scraped, servings: newServings });
                  return;
                }
                const ratio = newServings / originalServings;
                setScraped({
                  ...scraped,
                  servings: newServings,
                  ingredients: scraped.ingredients.map((ing) => ({
                    ...ing,
                    qty: ing.qty != null ? Math.round(ing.qty * ratio * 100) / 100 : null,
                  })),
                  calories: scraped.calories != null ? Math.round(scraped.calories * ratio) : undefined,
                  proteinG: scraped.proteinG != null ? Math.round(scraped.proteinG * ratio) : undefined,
                  carbsG: scraped.carbsG != null ? Math.round(scraped.carbsG * ratio) : undefined,
                  fatG: scraped.fatG != null ? Math.round(scraped.fatG * ratio) : undefined,
                });
                setOriginalServings(newServings);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-sm font-medium">Calories</label>
            <Input
              type="number"
              value={scraped.calories ?? ""}
              onChange={(e) =>
                setScraped({
                  ...scraped,
                  calories: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Protein (g)</label>
            <Input
              type="number"
              value={scraped.proteinG ?? ""}
              onChange={(e) =>
                setScraped({
                  ...scraped,
                  proteinG: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Carbs (g)</label>
            <Input
              type="number"
              value={scraped.carbsG ?? ""}
              onChange={(e) =>
                setScraped({
                  ...scraped,
                  carbsG: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fat (g)</label>
            <Input
              type="number"
              value={scraped.fatG ?? ""}
              onChange={(e) =>
                setScraped({
                  ...scraped,
                  fatG: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            Ingredients ({scraped.ingredients.length})
          </label>
          <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            {scraped.ingredients.map((ing, i) => (
              <div key={i} className="py-0.5">
                {ing.qty} {ing.unit} {ing.name}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            Steps ({scraped.steps.length})
          </label>
          <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            {scraped.steps.map((step, i) => (
              <div key={i} className="mb-1.5 leading-relaxed">
                <span className="font-semibold text-primary">{i + 1}.</span>{" "}
                {step}
              </div>
            ))}
          </div>
        </div>

        {scraped.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {scraped.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Recipe Role</label>
          <p className="text-xs text-muted-foreground mb-2">
            Is this a complete meal or does it need to be paired with sides?
          </p>
          <div className="flex flex-wrap gap-2">
            {RECIPE_ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  selectedRole === role.value
                    ? ROLE_COLORS[role.value]
                    : "border-border/60 text-muted-foreground hover:border-primary/30"
                )}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Meal Type</label>
          <p className="text-xs text-muted-foreground mb-2">
            When would you make this? Select all that apply.
          </p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((mt) => {
              const active = selectedMealTypes.includes(mt);
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() =>
                    setSelectedMealTypes((prev) =>
                      active
                        ? prev.filter((m) => m !== mt)
                        : [...prev, mt]
                    )
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all duration-200",
                    active
                      ? MEAL_TYPE_COLORS[mt]
                      : "border-border/60 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {mt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || selectedMealTypes.length === 0}>
          {saving ? "Saving..." : "Save Recipe"}
        </Button>
        <Button variant="outline" onClick={() => setScraped(null)}>
          Try Another URL
        </Button>
      </div>
    </div>
  );
}
