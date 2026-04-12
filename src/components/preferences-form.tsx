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
  Mail,
  Home,
  Package,
  Key,
  Copy,
  Check,
  ListChecks,
  RefreshCw,
  Loader2,
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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_PAGES = [
  { value: "/", label: "Dashboard" },
  { value: "/meal-plan", label: "Meal Plan" },
  { value: "/pantry", label: "Pantry" },
  { value: "/recipes", label: "Recipes" },
  { value: "/shopping-list", label: "Shopping List" },
  { value: "/schedule", label: "Schedule" },
];

interface Prefs {
  householdSize: number;
  householdSizeWorkDay: number;
  leftoverServings: number;
  eatingStyle: string;
  dislikes: string;
  allergies: string;
  dietaryNeeds: string;
  preferQuickMeals: boolean;
  preferSlowCooker: boolean;
  preferLeftovers: boolean;
  maxPrepMinutes: number;
  lowStockThreshold: number;
  defaultPage: string;
  emailEnabled: boolean;
  emailDay: number;
  emailTime: string;
}

const DEFAULTS: Prefs = {
  householdSize: 4,
  householdSizeWorkDay: 2,
  leftoverServings: 2,
  eatingStyle: "balanced",
  dislikes: "[]",
  allergies: "[]",
  dietaryNeeds: "[]",
  preferQuickMeals: false,
  preferSlowCooker: false,
  preferLeftovers: true,
  maxPrepMinutes: 60,
  lowStockThreshold: 0.5,
  defaultPage: "/meal-plan",
  emailEnabled: false,
  emailDay: 0,
  emailTime: "14:00",
};

export function PreferencesForm() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customDislike, setCustomDislike] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Google Tasks state
  const [taskLists, setTaskLists] = useState<Array<{ id: string; title: string }>>([]);
  const [taskSync, setTaskSync] = useState<{
    taskListId: string;
    taskListName: string;
    enabled: boolean;
    lastSyncAt: string | null;
  } | null>(null);
  const [loadingTaskLists, setLoadingTaskLists] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedTaskList, setSelectedTaskList] = useState("");
  const [taskSyncMessage, setTaskSyncMessage] = useState("");

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
    fetch("/api/auth/api-key")
      .then((r) => r.json())
      .then((data) => setHasApiKey(data.hasKey))
      .catch(() => {});
    fetch("/api/google-tasks/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.sync) {
          setTaskSync(data.sync);
          setSelectedTaskList(data.sync.taskListId);
        }
      })
      .catch(() => {});
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

  async function loadTaskLists() {
    setLoadingTaskLists(true);
    try {
      const res = await fetch("/api/google-tasks/lists");
      if (res.ok) {
        const data = await res.json();
        setTaskLists(data.lists);
      }
    } finally {
      setLoadingTaskLists(false);
    }
  }

  async function saveTaskSync() {
    const list = taskLists.find((l) => l.id === selectedTaskList);
    if (!list) return;
    const res = await fetch("/api/google-tasks/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskListId: list.id,
        taskListName: list.title,
        enabled: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTaskSync(data.sync);
      setTaskSyncMessage("Google Tasks connected!");
      setTimeout(() => setTaskSyncMessage(""), 3000);
    }
  }

  async function disconnectTaskSync() {
    await fetch("/api/google-tasks/settings", { method: "DELETE" });
    setTaskSync(null);
    setSelectedTaskList("");
    setTaskSyncMessage("");
  }

  async function triggerTaskSync() {
    setSyncing(true);
    setTaskSyncMessage("");
    try {
      const res = await fetch("/api/google-tasks/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTaskSyncMessage(`Imported ${data.imported} item(s)`);
        // Refresh sync settings to get updated lastSyncAt
        const settingsRes = await fetch("/api/google-tasks/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.sync) setTaskSync(settingsData.sync);
        }
      } else {
        setTaskSyncMessage("Sync failed — check Google connection");
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setTaskSyncMessage(""), 5000);
    }
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
          householdSizeWorkDay: prefs.householdSizeWorkDay,
          leftoverServings: prefs.leftoverServings,
          eatingStyle: prefs.eatingStyle,
          dislikes: prefs.dislikes,
          allergies: prefs.allergies,
          dietaryNeeds: prefs.dietaryNeeds,
          preferQuickMeals: prefs.preferQuickMeals,
          preferSlowCooker: prefs.preferSlowCooker,
          preferLeftovers: prefs.preferLeftovers,
          maxPrepMinutes: prefs.maxPrepMinutes,
          lowStockThreshold: prefs.lowStockThreshold,
          defaultPage: prefs.defaultPage,
          emailEnabled: prefs.emailEnabled,
          emailDay: prefs.emailDay,
          emailTime: prefs.emailTime,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function generateApiKey() {
    setGeneratingKey(true);
    try {
      const res = await fetch("/api/auth/api-key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setHasApiKey(true);
      }
    } finally {
      setGeneratingKey(false);
    }
  }

  async function revokeApiKey() {
    await fetch("/api/auth/api-key", { method: "DELETE" });
    setApiKey(null);
    setHasApiKey(false);
  }

  function copyApiKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
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
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="text-sm font-medium">
              How many people are you cooking for? (days off)
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
          <div>
            <label className="text-sm font-medium">
              How many eat at home when you&apos;re working?
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              e.g. partner + kids who still need dinner while you&apos;re on shift
            </p>
            <Input
              type="number"
              min={0}
              max={12}
              value={prefs.householdSizeWorkDay}
              onChange={(e) =>
                setPrefs({ ...prefs, householdSizeWorkDay: Number(e.target.value) })
              }
              className="w-24"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Extra leftover servings to pack
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              How many leftover portions for next-day lunches?
            </p>
            <Input
              type="number"
              min={0}
              max={8}
              value={prefs.leftoverServings}
              onChange={(e) =>
                setPrefs({ ...prefs, leftoverServings: Number(e.target.value) })
              }
              className="w-24"
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

      {/* Pantry & Navigation */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Pantry & Navigation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="text-sm font-medium">
              Low Stock Alert Threshold
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              Items at or below this quantity will be flagged as low stock and
              included in your weekly email.
            </p>
            <Input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={prefs.lowStockThreshold}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  lowStockThreshold: Number(e.target.value),
                })
              }
              className="w-24 mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Default Landing Page</label>
            <p className="text-xs text-muted-foreground mb-1">
              Which page to open when you launch the app.
            </p>
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-1"
              value={prefs.defaultPage}
              onChange={(e) =>
                setPrefs({ ...prefs, defaultPage: e.target.value })
              }
            >
              {DEFAULT_PAGES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Email */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Weekly Email
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Get your meal plan and shopping list delivered to your inbox each
            week.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <button
            onClick={() =>
              setPrefs({ ...prefs, emailEnabled: !prefs.emailEnabled })
            }
            className={cn(
              "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
              prefs.emailEnabled
                ? "border-primary bg-primary/5"
                : "border-border/60 text-muted-foreground hover:border-primary/30"
            )}
          >
            {prefs.emailEnabled ? "Email Enabled" : "Email Disabled"}
          </button>
          {prefs.emailEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Send On</label>
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-1 w-full"
                  value={prefs.emailDay}
                  onChange={(e) =>
                    setPrefs({ ...prefs, emailDay: Number(e.target.value) })
                  }
                >
                  {DAY_NAMES.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-1 w-full"
                  value={prefs.emailTime}
                  onChange={(e) =>
                    setPrefs({ ...prefs, emailTime: e.target.value })
                  }
                >
                  {Array.from({ length: 24 }, (_, h) => {
                    const time = `${String(h).padStart(2, "0")}:00`;
                    const label =
                      h === 0
                        ? "12:00 AM"
                        : h < 12
                          ? `${h}:00 AM`
                          : h === 12
                            ? "12:00 PM"
                            : `${h - 12}:00 PM`;
                    return (
                      <option key={time} value={time}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Tasks Import */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Google Tasks Import
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Import shopping items from a Google Tasks list into your cart queue nightly.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {taskSync ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Connected: {taskSync.taskListName}
                  </p>
                  {taskSync.lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Last sync:{" "}
                      {new Date(taskSync.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Badge variant={taskSync.enabled ? "default" : "secondary"}>
                  {taskSync.enabled ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerTaskSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectTaskSync}
                  className="text-destructive"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {taskLists.length === 0 ? (
                <Button
                  variant="outline"
                  onClick={loadTaskLists}
                  disabled={loadingTaskLists}
                >
                  {loadingTaskLists ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ListChecks className="h-4 w-4 mr-2" />
                  )}
                  Load Task Lists
                </Button>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Select a Tasks List</label>
                    <select
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-1 w-full"
                      value={selectedTaskList}
                      onChange={(e) => setSelectedTaskList(e.target.value)}
                    >
                      <option value="">Choose a list...</option>
                      {taskLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={saveTaskSync}
                    disabled={!selectedTaskList}
                    size="sm"
                  >
                    Connect
                  </Button>
                </>
              )}
            </div>
          )}
          {taskSyncMessage && (
            <p className="text-sm text-primary font-medium">{taskSyncMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Browser Extension */}
      <Card className="border-border/60">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Browser Extension
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Add items to your pantry directly from Walmart.ca product pages.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {apiKey ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-deep">
                Copy this key now — it won&apos;t be shown again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono break-all">
                  {apiKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={copyApiKey}
                >
                  {keyCopied ? (
                    <Check className="h-4 w-4 text-sage" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : hasApiKey ? (
            <p className="text-sm text-muted-foreground">
              API key is active. The extension is connected.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate an API key to connect the Chrome extension.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant={hasApiKey ? "outline" : "default"}
              onClick={generateApiKey}
              disabled={generatingKey}
            >
              <Key className="h-4 w-4 mr-2" />
              {generatingKey
                ? "Generating..."
                : hasApiKey
                  ? "Regenerate Key"
                  : "Generate API Key"}
            </Button>
            {hasApiKey && (
              <Button variant="ghost" onClick={revokeApiKey} className="text-destructive">
                Revoke
              </Button>
            )}
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
