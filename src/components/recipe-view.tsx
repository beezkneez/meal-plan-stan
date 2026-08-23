"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Minus,
  Plus,
  Pencil,
  Save,
  X,
  Trash2,
  Star,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RecipeIngredient } from "@/types";

// One line of the "what will actually be added" confirmation
type PreviewItem = {
  name: string;
  unit: string;
  needed: number;
  onHand: number;
  toAdd: number;
  covered: boolean;
  inPantry: boolean;
  include: boolean;
};

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
  mealTypes: string;
  role: string;
  isQuick: boolean;
  isSlowCook: boolean;
  leftoverFriendly: boolean;
  rating: number;
}

const RECIPE_ROLES = [
  { value: "complete", label: "Complete" },
  { value: "main", label: "Main" },
  { value: "side", label: "Side" },
  { value: "veggie", label: "Veggie" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "sauce", label: "Sauce" },
  { value: "marinade", label: "Marinade" },
  { value: "dessert", label: "Dessert" },
  { value: "drink", label: "Drink" },
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

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

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-warm/15 text-amber-deep border-amber-warm/25",
  lunch: "bg-sage/15 text-sage border-sage/25",
  dinner: "bg-terracotta/15 text-terracotta border-terracotta/25",
  snack: "bg-indigo-shift/15 text-indigo-shift border-indigo-shift/25",
};

export function RecipeView({ id }: { id: string }) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [adjustedServings, setAdjustedServings] = useState<number | null>(null);
  const [addingToList, setAddingToList] = useState(false);
  const [listMessage, setListMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    ingredients: RecipeIngredient[];
    steps: string[];
    tags: string[];
    mealTypes: string[];
    role: string;
    sourceUrl?: string;
    imageUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing() {
    if (!recipe) return;
    setEditData({
      title: recipe.title,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      servings: recipe.servings,
      calories: recipe.calories,
      proteinG: recipe.proteinG,
      carbsG: recipe.carbsG,
      fatG: recipe.fatG,
      ingredients: JSON.parse(recipe.ingredients),
      steps: JSON.parse(recipe.steps),
      tags: JSON.parse(recipe.tags),
      mealTypes: JSON.parse(recipe.mealTypes ?? '["dinner"]'),
      role: recipe.role ?? "complete",
      sourceUrl: recipe.sourceUrl,
      imageUrl: recipe.imageUrl,
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditData(null);
  }

  async function saveEdits() {
    if (!editData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecipe(updated);
        setEditing(false);
        setEditData(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe() {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  function updateIngredient(
    index: number,
    field: keyof RecipeIngredient,
    value: string | number | null
  ) {
    if (!editData) return;
    const updated = [...editData.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setEditData({ ...editData, ingredients: updated });
  }

  function removeIngredient(index: number) {
    if (!editData) return;
    setEditData({
      ...editData,
      ingredients: editData.ingredients.filter((_, i) => i !== index),
    });
  }

  function addIngredient() {
    if (!editData) return;
    setEditData({
      ...editData,
      ingredients: [
        ...editData.ingredients,
        { name: "", qty: null, unit: "" },
      ],
    });
  }

  function updateStep(index: number, value: string) {
    if (!editData) return;
    const updated = [...editData.steps];
    updated[index] = value;
    setEditData({ ...editData, steps: updated });
  }

  function removeStep(index: number) {
    if (!editData) return;
    setEditData({
      ...editData,
      steps: editData.steps.filter((_, i) => i !== index),
    });
  }

  function addStep() {
    if (!editData) return;
    setEditData({ ...editData, steps: [...editData.steps, ""] });
  }

  function toggleMealType(mt: string) {
    if (!editData) return;
    setEditData({
      ...editData,
      mealTypes: editData.mealTypes.includes(mt)
        ? editData.mealTypes.filter((m) => m !== mt)
        : [...editData.mealTypes, mt],
    });
  }

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

  // ── EDIT MODE ──
  if (editing && editData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to recipes
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEditing}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveEdits} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card className="border-border/60 overflow-hidden">
          <div className="bg-gradient-to-r from-accent/40 to-transparent px-5 py-4">
            <h2 className="font-display text-xl font-bold">Edit Recipe</h2>
          </div>
          <CardContent className="pt-5 space-y-5">
            {/* Title + URLs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  value={editData.imageUrl ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      imageUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source URL</label>
                <Input
                  value={editData.sourceUrl ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      sourceUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Times + servings */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Prep (min)</label>
                <Input
                  type="number"
                  value={editData.prepMinutes}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      prepMinutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cook (min)</label>
                <Input
                  type="number"
                  value={editData.cookMinutes}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      cookMinutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Servings</label>
                <Input
                  type="number"
                  value={editData.servings}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      servings: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium">Calories</label>
                <Input
                  type="number"
                  value={editData.calories ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      calories: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Protein (g)</label>
                <Input
                  type="number"
                  value={editData.proteinG ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      proteinG: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Carbs (g)</label>
                <Input
                  type="number"
                  value={editData.carbsG ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      carbsG: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fat (g)</label>
                <Input
                  type="number"
                  value={editData.fatG ?? ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      fatG: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-medium">Recipe Role</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {RECIPE_ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() =>
                      setEditData({ ...editData, role: r.value })
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                      editData.role === r.value
                        ? ROLE_COLORS[r.value]
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Types */}
            <div>
              <label className="text-sm font-medium">Meal Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt}
                    onClick={() => toggleMealType(mt)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all",
                      editData.mealTypes.includes(mt)
                        ? MEAL_TYPE_COLORS[mt]
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Ingredients ({editData.ingredients.length})
                </label>
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {editData.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      className="w-16"
                      placeholder="Qty"
                      value={ing.qty ?? ""}
                      onChange={(e) =>
                        updateIngredient(
                          i,
                          "qty",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                    <Input
                      className="w-20"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) =>
                        updateIngredient(i, "unit", e.target.value)
                      }
                    />
                    <Input
                      className="flex-1"
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) =>
                        updateIngredient(i, "name", e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeIngredient(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Steps ({editData.steps.length})
                </label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {editData.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-1">
                      {i + 1}
                    </span>
                    <textarea
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                      value={step}
                      onChange={(e) => updateStep(i, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mt-1"
                      onClick={() => removeStep(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete */}
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={deleteRecipe}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Recipe
          </Button>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ──
  const rawIngredients: RecipeIngredient[] = JSON.parse(recipe.ingredients);
  const steps: string[] = JSON.parse(recipe.steps);
  const tags: string[] = JSON.parse(recipe.tags);
  const mealTypes: string[] = JSON.parse(recipe.mealTypes ?? '["dinner"]');

  const currentServings = adjustedServings ?? recipe.servings;
  const servingRatio = currentServings / recipe.servings;

  // Show what would land on the list once the pantry is deducted, before
  // committing anything — a stale pantry count is caught here, not in the shop.
  async function openPreview() {
    if (!recipe) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/shopping-list/preview?recipeId=${recipe.id}&servings=${currentServings}`
      );
      const data = await res.json();
      setPreviewItems(
        (data.items ?? []).map((item: Omit<PreviewItem, "include">) => ({
          ...item,
          // Anything the pantry already covers starts unticked
          include: !item.covered,
        }))
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function updatePreviewItem(index: number, changes: Partial<PreviewItem>) {
    setPreviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...changes } : item))
    );
  }

  // Commit exactly the lines that are ticked, at the quantities on screen
  async function confirmAddToList() {
    if (!recipe) return;
    const chosen = previewItems.filter((i) => i.include && i.toAdd > 0);
    if (chosen.length === 0) return;

    setAddingToList(true);
    try {
      const res = await fetch("/api/shopping-list/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          items: chosen.map((i) => ({
            name: i.name,
            qty: i.toAdd,
            unit: i.unit,
          })),
        }),
      });
      const data = await res.json();
      setListMessage(
        res.ok
          ? `Added ${data.added} item${data.added === 1 ? "" : "s"}`
          : data.error || "Could not add to list"
      );
      setPreviewOpen(false);
    } catch {
      setListMessage("Could not reach the server");
    } finally {
      setAddingToList(false);
      setTimeout(() => setListMessage(""), 3000);
    }
  }

  const ingredients = rawIngredients.map((ing) => ({
    ...ing,
    qty:
      ing.qty != null
        ? Math.round(ing.qty * servingRatio * 100) / 100
        : null,
  }));

  function formatQty(qty: number): string {
    if (qty === Math.floor(qty)) return String(qty);
    const frac = qty - Math.floor(qty);
    const whole = Math.floor(qty);
    const fractions: [number, string][] = [
      [0.25, "\u00BC"],
      [0.33, "\u2153"],
      [0.5, "\u00BD"],
      [0.67, "\u2154"],
      [0.75, "\u00BE"],
    ];
    for (const [val, sym] of fractions) {
      if (Math.abs(frac - val) < 0.05) {
        return whole > 0 ? `${whole} ${sym}` : sym;
      }
    }
    return qty.toFixed(1);
  }

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
      value: Math.round(recipe.calories * servingRatio),
      unit: "kcal",
      icon: Flame,
      color: "text-amber-warm",
    },
    recipe.proteinG != null && {
      label: "Protein",
      value: Math.round(recipe.proteinG * servingRatio),
      unit: "g",
      icon: Beef,
      color: "text-terracotta",
    },
    recipe.carbsG != null && {
      label: "Carbs",
      value: Math.round(recipe.carbsG * servingRatio),
      unit: "g",
      icon: Wheat,
      color: "text-amber-deep",
    },
    recipe.fatG != null && {
      label: "Fat",
      value: Math.round(recipe.fatG * servingRatio),
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

  const sections = new Map<string, { ing: RecipeIngredient; idx: number }[]>();
  ingredients.forEach((ing, idx) => {
    const section = ing.section ?? "Ingredients";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push({ ing, idx });
  });

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recipes
        </Link>
        <Button variant="outline" onClick={startEditing}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setAdjustedServings(Math.max(1, currentServings - 1))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="font-semibold min-w-[3ch] text-center tabular-nums">
              {currentServings}
            </span>
            <button
              onClick={() => setAdjustedServings(currentServings + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="text-muted-foreground ml-0.5">servings</span>
            {adjustedServings && adjustedServings !== recipe.servings && (
              <button
                onClick={() => setAdjustedServings(null)}
                className="text-xs text-primary hover:underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
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
        {/* Star rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={async () => {
                const newRating = recipe.rating === star ? 0 : star;
                setRecipe({ ...recipe, rating: newRating });
                await fetch(`/api/recipes/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rating: newRating }),
                });
              }}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  star <= recipe.rating
                    ? "fill-amber-warm text-amber-warm"
                    : "text-border hover:text-amber-warm/50"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <Badge
          className={`font-medium capitalize ${ROLE_COLORS[recipe.role] ?? ROLE_COLORS.complete}`}
        >
          {recipe.role}
        </Badge>
        {mealTypes.map((mt) => (
          <Badge
            key={mt}
            className={`font-medium capitalize ${MEAL_TYPE_COLORS[mt] ?? ""}`}
          >
            {mt}
          </Badge>
        ))}
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
        <div>
          <Card className="border-border/60 overflow-hidden lg:sticky lg:top-8">
            <div className="bg-gradient-to-r from-accent/40 to-transparent px-5 py-4">
              <h2 className="font-display text-lg font-bold">Ingredients</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ingredients.length} items &middot; Tap to check off
                {adjustedServings && adjustedServings !== recipe.servings && (
                  <span className="text-primary ml-1">
                    &middot; Scaled to {currentServings} servings
                  </span>
                )}
              </p>
            </div>
            <div className="border-b border-border/60 px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={openPreview}
                disabled={addingToList}
              >
                <ShoppingCart className="h-4 w-4" />
                {listMessage ||
                  (addingToList ? "Adding..." : "Add to Shopping List")}
              </Button>
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
                                {formatQty(ing.qty)}{" "}
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

      {/* Confirm what actually gets added, after the pantry is deducted */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Add to shopping list
            </DialogTitle>
            <DialogDescription>
              Quantities below already have your pantry subtracted. Untick
              anything you don&apos;t need, or change an amount.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
              {previewItems.map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2",
                    !item.include && "opacity-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.include}
                    onChange={(e) =>
                      updatePreviewItem(i, { include: e.target.checked })
                    }
                    className="h-4 w-4 shrink-0 accent-primary"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Need {item.needed}
                      {item.unit ? ` ${item.unit}` : ""}
                      {item.inPantry
                        ? ` · have ${item.onHand}`
                        : " · not in pantry"}
                      {item.covered && " · already covered"}
                    </p>
                  </div>

                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.toAdd}
                    onChange={(e) =>
                      updatePreviewItem(i, {
                        toAdd: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 w-20 shrink-0 text-right"
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddToList}
              disabled={
                addingToList ||
                previewItems.filter((i) => i.include && i.toAdd > 0).length === 0
              }
            >
              Add{" "}
              {previewItems.filter((i) => i.include && i.toAdd > 0).length} item
              {previewItems.filter((i) => i.include && i.toAdd > 0).length === 1
                ? ""
                : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
