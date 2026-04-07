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
  Upload,
  Check,
  Globe,
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
  { value: "complete", label: "Complete Meal" },
  { value: "main", label: "Main" },
  { value: "side", label: "Side" },
  { value: "veggie", label: "Veggie" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "sauce", label: "Sauce / Dressing" },
  { value: "marinade", label: "Marinade / Rub" },
  { value: "dessert", label: "Dessert" },
  { value: "drink", label: "Drink" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  complete: "bg-primary/10 text-primary border-primary/20",
  main: "bg-terracotta/15 text-terracotta border-terracotta/25",
  side: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  veggie: "bg-sage/15 text-sage border-sage/25",
  soup: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
  salad: "bg-sage/15 text-sage border-sage/25",
  sauce: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  marinade: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  dessert: "bg-terracotta/15 text-terracotta border-terracotta/25",
  drink: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
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
  const [webSearch, setWebSearch] = useState(false);
  const [searchType, setSearchType] = useState<"full" | "component">("full");
  const [webResults, setWebResults] = useState<{ title: string; description: string; imageUrl?: string; sourceUrl?: string; prepMinutes: number; cookMinutes: number; totalMinutes: number; servings: number; calories?: number; proteinG?: number; carbsG?: number; fatG?: number; ingredients: { name: string; qty: number | null; unit: string }[]; steps: string[]; tags: string[]; mealTypes: string[]; source: string }[]>([]);
  const [webSearching, setWebSearching] = useState(false);
  const [approvedWeb, setApprovedWeb] = useState<Set<number>>(new Set());
  const [approvingWeb, setApprovingWeb] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [parsedRecipes, setParsedRecipes] = useState<{ title: string; ingredients: unknown[]; steps: string[] }[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);

  async function loadRecipes() {
    const res = await fetch(`/api/recipes?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRecipes();
  }, [search]);

  async function searchWeb() {
    if (!search.trim()) return;
    setWebSearching(true);
    setApprovedWeb(new Set());
    try {
      const source = searchType === "component" ? "ai" : "both";
      const q = searchType === "component" ? `${search} — just the sauce/marinade/side recipe by itself, NOT a full dinner` : search;
      const params = new URLSearchParams({ q, mealType: "any", source, offset: "0" });
      const res = await fetch(`/api/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWebResults(data.recipes ?? []);
      }
    } finally {
      setWebSearching(false);
    }
  }

  async function approveWebRecipe(index: number) {
    const recipe = webResults[index];
    setApprovingWeb(index);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      if (res.ok) {
        setApprovedWeb((prev) => new Set([...prev, index]));
        loadRecipes();
      }
    } finally {
      setApprovingWeb(null);
    }
  }

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
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={webSearch ? "Search web for recipes..." : "Search your recipes..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && webSearch && searchWeb()}
            className="pl-9"
          />
        </div>
        <Button
          variant={webSearch ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setWebSearch(!webSearch);
            if (!webSearch) setWebResults([]);
          }}
        >
          <Globe className="h-4 w-4 mr-1.5" />
          {webSearch ? "Web On" : "Search Web"}
        </Button>
        {webSearch && (
          <>
            <button
              onClick={() => setSearchType("full")}
              className={cn(
                "rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all",
                searchType === "full"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              Full Meals
            </button>
            <button
              onClick={() => setSearchType("component")}
              className={cn(
                "rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all",
                searchType === "component"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              Sauces / Sides / Marinades
            </button>
          </>
        )}
        {webSearch && search.trim() && (
          <Button size="sm" onClick={searchWeb} disabled={webSearching}>
            {webSearching ? "Searching..." : "Find Recipes"}
          </Button>
        )}
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
        <Button variant="outline" onClick={() => setCreateOpen(!createOpen)}>
          <ChefHat className="h-4 w-4 mr-2" />
          Create Recipe
        </Button>
        <Button variant="outline" onClick={() => setBulkImportOpen(!bulkImportOpen)}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </div>

      {/* Create recipe form */}
      {createOpen && <CreateRecipeForm onSaved={() => { setCreateOpen(false); loadRecipes(); }} />}

      {/* Web search results */}
      {webSearch && webResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              Web Results ({webResults.length})
            </p>
            <p className="text-xs text-muted-foreground">
              — tap Approve to add to your recipe book
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {webResults.map((recipe, index) => {
              const isApproved = approvedWeb.has(index);
              return (
                <Card key={index} className={cn(
                  "overflow-hidden border-border/60",
                  isApproved && "ring-2 ring-sage border-sage/40"
                )}>
                  {recipe.imageUrl && (
                    <div className="h-32 overflow-hidden">
                      <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <p className="font-display text-sm font-semibold leading-tight">{recipe.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {recipe.totalMinutes > 0 && <span>{recipe.totalMinutes}m</span>}
                      {recipe.proteinG && <span>{recipe.proteinG}g protein</span>}
                      {recipe.ingredients.length > 0 && <span>{recipe.ingredients.length} ing.</span>}
                    </div>
                    {isApproved ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-sage">
                        <Check className="h-4 w-4" />
                        Added
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => approveWebRecipe(index)}
                        disabled={approvingWeb === index}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {approvingWeb === index ? "Adding..." : "Approve"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {webSearch && webSearching && (
        <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Searching the web and AI...
        </div>
      )}

      {/* Bulk import panel */}
      {bulkImportOpen && (
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="py-5 space-y-3">
            {parsedRecipes.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-semibold">Import from CopyMeThat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to CopyMeThat → Settings → Export Recipes. Open the exported file,
                    select all (Ctrl+A), copy (Ctrl+C), and paste below.
                  </p>
                </div>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
                  placeholder="Paste your CopyMeThat export here..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    setParsing(true);
                    setBulkResult("");
                    try {
                      const res = await fetch("/api/recipes/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: bulkText, format: "copymethat", parseOnly: true }),
                      });
                      const data = await res.json();
                      if (data.recipes?.length > 0) {
                        setParsedRecipes(data.recipes);
                        setSelectedRecipes(new Set(data.recipes.map((_: unknown, i: number) => i)));
                      } else {
                        setBulkResult("No recipes found in the pasted text.");
                      }
                    } finally {
                      setParsing(false);
                    }
                  }}
                  disabled={parsing || !bulkText.trim()}
                >
                  {parsing ? "Scanning..." : "Scan Recipes"}
                </Button>
                {bulkResult && (
                  <p className="text-sm text-destructive">{bulkResult}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Found {parsedRecipes.length} recipes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRecipes.size} selected for import
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedRecipes.size === parsedRecipes.length) {
                          setSelectedRecipes(new Set());
                        } else {
                          setSelectedRecipes(new Set(parsedRecipes.map((_, i) => i)));
                        }
                      }}
                    >
                      {selectedRecipes.size === parsedRecipes.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-xl border border-border/60 p-1">
                  {parsedRecipes.map((r, i) => {
                    const selected = selectedRecipes.has(i);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedRecipes((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                          selected ? "bg-primary/5" : "hover:bg-accent/20"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                            selected ? "bg-primary border-primary" : "border-border"
                          )}
                        >
                          {selected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.ingredients.length} ingredients &middot; {r.steps.length} steps
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={async () => {
                      setBulkImporting(true);
                      setBulkResult("");
                      try {
                        const res = await fetch("/api/recipes/import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            text: bulkText,
                            format: "copymethat",
                            selected: [...selectedRecipes],
                          }),
                        });
                        const data = await res.json();
                        if (data.imported > 0) {
                          setBulkResult(`Imported ${data.imported} recipes!`);
                          setBulkText("");
                          setParsedRecipes([]);
                          setSelectedRecipes(new Set());
                          loadRecipes();
                        } else {
                          setBulkResult(data.error ?? "No recipes imported.");
                        }
                      } finally {
                        setBulkImporting(false);
                      }
                    }}
                    disabled={bulkImporting || selectedRecipes.size === 0}
                  >
                    {bulkImporting ? "Importing..." : `Import ${selectedRecipes.size} Recipes`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedRecipes([]);
                      setSelectedRecipes(new Set());
                      setBulkResult("");
                    }}
                  >
                    Back
                  </Button>
                  {bulkResult && (
                    <p className={cn(
                      "text-sm font-medium",
                      bulkResult.startsWith("Imported") ? "text-sage" : "text-destructive"
                    )}>
                      {bulkResult}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

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

function CreateRecipeForm({ onSaved }: { onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [prepMinutes, setPrepMinutes] = useState(0);
  const [cookMinutes, setCookMinutes] = useState(0);
  const [servings, setServings] = useState(4);
  const [calories, setCalories] = useState<number | "">("");
  const [proteinG, setProteinG] = useState<number | "">("");
  const [carbsG, setCarbsG] = useState<number | "">("");
  const [fatG, setFatG] = useState<number | "">("");
  const [ingredientText, setIngredientText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [selectedRole, setSelectedRole] = useState("complete");
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["dinner"]);
  const [imageUrl, setImageUrl] = useState("");
  const [tagsText, setTagsText] = useState("");

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Parse ingredients - one per line
      const ingredients = ingredientText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(
            /^([\d./½⅓⅔¼¾]+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|lbs?|g|kg|ml|cans?|cloves?)?\s*(.+)/i
          );
          if (match) {
            return {
              qty: match[1] ? parseFloat(match[1]) || null : null,
              unit: match[2]?.toLowerCase() ?? "",
              name: match[3].trim(),
            };
          }
          return { qty: null, unit: "", name: line };
        });

      // Parse steps - one per line
      const steps = stepsText
        .split("\n")
        .map((line) => line.trim().replace(/^\d+[.)]\s*/, ""))
        .filter(Boolean);

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prepMinutes,
          cookMinutes,
          servings,
          calories: calories || undefined,
          proteinG: proteinG || undefined,
          carbsG: carbsG || undefined,
          fatG: fatG || undefined,
          ingredients,
          steps,
          tags: tagsText.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
          mealTypes: selectedMealTypes,
          role: selectedRole,
          imageUrl: imageUrl || undefined,
        }),
      });
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="bg-gradient-to-r from-accent/40 to-transparent px-5 py-4">
        <h3 className="font-display text-lg font-bold">Create a Recipe</h3>
        <p className="text-xs text-muted-foreground">Type in your own recipe from scratch.</p>
      </div>
      <CardContent className="pt-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Recipe Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greek Chicken Marinade"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Prep (min)</label>
            <Input type="number" value={prepMinutes || ""} onChange={(e) => setPrepMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Cook (min)</label>
            <Input type="number" value={cookMinutes || ""} onChange={(e) => setCookMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Servings</label>
            <Input type="number" value={servings} onChange={(e) => setServings(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium">Calories</label>
            <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : "")} placeholder="—" />
          </div>
          <div>
            <label className="text-sm font-medium">Protein (g)</label>
            <Input type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value ? Number(e.target.value) : "")} placeholder="—" />
          </div>
          <div>
            <label className="text-sm font-medium">Carbs (g)</label>
            <Input type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value ? Number(e.target.value) : "")} placeholder="—" />
          </div>
          <div>
            <label className="text-sm font-medium">Fat (g)</label>
            <Input type="number" value={fatG} onChange={(e) => setFatG(e.target.value ? Number(e.target.value) : "")} placeholder="—" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Image URL (optional)</label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>

        {/* Role */}
        <div>
          <label className="text-sm font-medium">Recipe Role</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {RECIPE_ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  selectedRole === role.value
                    ? ROLE_COLORS[role.value]
                    : "border-border/60 text-muted-foreground"
                )}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meal type */}
        <div>
          <label className="text-sm font-medium">Meal Type</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {MEAL_TYPES.map((mt) => {
              const active = selectedMealTypes.includes(mt);
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() =>
                    setSelectedMealTypes((prev) =>
                      active ? prev.filter((m) => m !== mt) : [...prev, mt]
                    )
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all",
                    active
                      ? MEAL_TYPE_COLORS[mt]
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  {mt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="text-sm font-medium">Ingredients</label>
          <p className="text-xs text-muted-foreground mb-1">One per line. e.g. "2 tbsp olive oil" or just "salt and pepper"</p>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
            placeholder={"2 tbsp olive oil\n3 cloves garlic, minced\n1 lemon, juiced\n1 tsp oregano\nSalt and pepper"}
          />
        </div>

        {/* Steps */}
        <div>
          <label className="text-sm font-medium">Steps</label>
          <p className="text-xs text-muted-foreground mb-1">One step per line.</p>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder={"Mix all ingredients in a bowl.\nAdd chicken and coat evenly.\nMarinate for at least 2 hours.\nGrill or bake as desired."}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium">Tags</label>
          <p className="text-xs text-muted-foreground mb-1">Comma separated. e.g. "greek, easy, bbq, kid-friendly"</p>
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="greek, easy, bbq, kid-friendly"
          />
        </div>

        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Save Recipe"}
        </Button>
      </CardContent>
    </Card>
  );
}
