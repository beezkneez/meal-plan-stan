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
} from "lucide-react";
import type { ScrapedRecipe } from "@/types";

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
            return (
              <Card
                key={recipe.id}
                className="card-warm group overflow-hidden border-border/60"
              >
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
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display text-base leading-snug">
                      {recipe.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      onClick={() => deleteRecipe(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                  <div className="flex flex-wrap gap-1.5">
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
      setScraped(await res.json());
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
        body: JSON.stringify(scraped),
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
              onChange={(e) =>
                setScraped({ ...scraped, servings: Number(e.target.value) })
              }
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
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Recipe"}
        </Button>
        <Button variant="outline" onClick={() => setScraped(null)}>
          Try Another URL
        </Button>
      </div>
    </div>
  );
}
