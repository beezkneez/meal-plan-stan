"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Save,
  X,
  Plus,
  Heart,
  ShieldAlert,
  Utensils,
  Clock,
  Users,
} from "lucide-react";

const EATING_STYLES = [
  {
    value: "balanced",
    label: "Balanced",
    desc: "A bit of everything, well-rounded meals",
  },
  {
    value: "healthy",
    label: "Healthy",
    desc: "Lean proteins, lots of veggies, whole grains",
  },
  {
    value: "family",
    label: "Family Friendly",
    desc: "Kid-approved, crowd-pleasing comfort food",
  },
  {
    value: "bulking",
    label: "High Protein",
    desc: "Protein-packed meals for muscle & recovery",
  },
  {
    value: "budget",
    label: "Budget",
    desc: "Stretch your dollar, simple ingredients",
  },
  {
    value: "keto",
    label: "Keto / Low-Carb",
    desc: "High fat, low carb, minimal sugar",
  },
];

const COMMON_DISLIKES = [
  "mushrooms",
  "olives",
  "anchovies",
  "cilantro",
  "blue cheese",
  "liver",
  "tofu",
  "brussels sprouts",
  "beets",
  "eggplant",
  "coconut",
  "seafood",
];

const COMMON_ALLERGIES = [
  "gluten",
  "dairy",
  "nuts",
  "peanuts",
  "shellfish",
  "eggs",
  "soy",
  "fish",
  "sesame",
];

const DIETARY_NEEDS = [
  "high-protein",
  "low-carb",
  "low-sodium",
  "vegetarian",
  "vegan",
  "pescatarian",
  "dairy-free",
  "gluten-free",
];

interface Prefs {
  householdSize: number;
  eatingStyle: string;
  dislikes: string;
  allergies: string;
  dietaryNeeds: string;
  preferQuickMeals: boolean;
  preferSlowCooker: boolean;
  preferLeftovers: boolean;
  maxPrepMinutes: number;
}

const DEFAULTS: Prefs = {
  householdSize: 4,
  eatingStyle: "balanced",
  dislikes: "[]",
  allergies: "[]",
  dietaryNeeds: "[]",
  preferQuickMeals: false,
  preferSlowCooker: false,
  preferLeftovers: true,
  maxPrepMinutes: 60,
};

export function PreferencesForm() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customDislike, setCustomDislike] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");

  const dislikes: string[] = JSON.parse(prefs.dislikes);
  const allergies: string[] = JSON.parse(prefs.allergies);
  const dietaryNeeds: string[] = JSON.parse(prefs.dietaryNeeds);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setPrefs(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleInList(
    field: "dislikes" | "allergies" | "dietaryNeeds",
    item: string
  ) {
    const list: string[] = JSON.parse(prefs[field]);
    const updated = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];
    setPrefs({ ...prefs, [field]: JSON.stringify(updated) });
  }

  function addCustom(
    field: "dislikes" | "allergies",
    value: string,
    setter: (v: string) => void
  ) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    const list: string[] = JSON.parse(prefs[field]);
    if (!list.includes(trimmed)) {
      setPrefs({ ...prefs, [field]: JSON.stringify([...list, trimmed]) });
    }
    setter("");
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdSize: prefs.householdSize,
          eatingStyle: prefs.eatingStyle,
          dislikes: prefs.dislikes,
          allergies: prefs.allergies,
          dietaryNeeds: prefs.dietaryNeeds,
          preferQuickMeals: prefs.preferQuickMeals,
          preferSlowCooker: prefs.preferSlowCooker,
          preferLeftovers: prefs.preferLeftovers,
          maxPrepMinutes: prefs.maxPrepMinutes,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Household Size */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">Household</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div>
            <label className="text-sm font-medium">
              How many people are you cooking for?
            </label>
            <Input
              type="number"
              min={1}
              max={12}
              value={prefs.householdSize}
              onChange={(e) =>
                setPrefs({ ...prefs, householdSize: Number(e.target.value) })
              }
              className="w-24 mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Eating Style */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Eating Style
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            This shapes what kinds of recipes the meal planner picks for you.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EATING_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() =>
                  setPrefs({ ...prefs, eatingStyle: style.value })
                }
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all duration-200",
                  prefs.eatingStyle === style.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/30 hover:bg-accent/20"
                )}
              >
                <p className="font-semibold text-sm">{style.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {style.desc}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dislikes */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-terracotta" />
            <CardTitle className="font-display text-xl">Dislikes</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Foods you don&apos;t like. We&apos;ll avoid recipes with these.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {COMMON_DISLIKES.map((item) => (
              <button
                key={item}
                onClick={() => toggleInList("dislikes", item)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  dislikes.includes(item)
                    ? "border-terracotta/40 bg-terracotta/10 text-terracotta"
                    : "border-border/60 text-muted-foreground hover:border-terracotta/30"
                )}
              >
                {dislikes.includes(item) && (
                  <X className="inline h-3 w-3 mr-1 -mt-0.5" />
                )}
                {item}
              </button>
            ))}
          </div>
          {dislikes.filter((d) => !COMMON_DISLIKES.includes(d)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dislikes
                .filter((d) => !COMMON_DISLIKES.includes(d))
                .map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-terracotta/40 bg-terracotta/10 text-terracotta cursor-pointer"
                    onClick={() => toggleInList("dislikes", item)}
                  >
                    {item}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add something else..."
              value={customDislike}
              onChange={(e) => setCustomDislike(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addCustom("dislikes", customDislike, setCustomDislike)
              }
              className="w-56"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addCustom("dislikes", customDislike, setCustomDislike)
              }
              disabled={!customDislike.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="font-display text-xl">Allergies</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Serious allergies. These ingredients will be strictly excluded.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGIES.map((item) => (
              <button
                key={item}
                onClick={() => toggleInList("allergies", item)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  allergies.includes(item)
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border/60 text-muted-foreground hover:border-destructive/30"
                )}
              >
                {allergies.includes(item) && (
                  <X className="inline h-3 w-3 mr-1 -mt-0.5" />
                )}
                {item}
              </button>
            ))}
          </div>
          {allergies.filter((a) => !COMMON_ALLERGIES.includes(a)).length >
            0 && (
            <div className="flex flex-wrap gap-2">
              {allergies
                .filter((a) => !COMMON_ALLERGIES.includes(a))
                .map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 text-destructive cursor-pointer"
                    onClick={() => toggleInList("allergies", item)}
                  >
                    {item}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add another allergy..."
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addCustom("allergies", customAllergy, setCustomAllergy)
              }
              className="w-56"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addCustom("allergies", customAllergy, setCustomAllergy)
              }
              disabled={!customAllergy.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Needs */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-sage" />
            <CardTitle className="font-display text-xl">
              Dietary Needs
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Special dietary requirements to consider when planning meals.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2">
            {DIETARY_NEEDS.map((item) => (
              <button
                key={item}
                onClick={() => toggleInList("dietaryNeeds", item)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  dietaryNeeds.includes(item)
                    ? "border-sage/40 bg-sage/10 text-sage"
                    : "border-border/60 text-muted-foreground hover:border-sage/30"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cooking Preferences */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Cooking Preferences
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            {[
              {
                key: "preferQuickMeals" as const,
                label: "Quick meals (under 30 min)",
              },
              {
                key: "preferSlowCooker" as const,
                label: "Slow cooker / crockpot",
              },
              {
                key: "preferLeftovers" as const,
                label: "Plan for leftovers",
              },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}
                className={cn(
                  "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  prefs[key]
                    ? "border-primary bg-primary/5"
                    : "border-border/60 text-muted-foreground hover:border-primary/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium">
              Max prep time (minutes)
            </label>
            <Input
              type="number"
              min={10}
              max={180}
              step={5}
              value={prefs.maxPrepMinutes}
              onChange={(e) =>
                setPrefs({ ...prefs, maxPrepMinutes: Number(e.target.value) })
              }
              className="w-24 mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
        {saved && (
          <span className="text-sm text-sage font-medium animate-in fade-in">
            Preferences saved!
          </span>
        )}
      </div>
    </div>
  );
}
