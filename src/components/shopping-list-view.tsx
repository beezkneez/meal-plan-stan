"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  section: string;
  fromPantry?: boolean;
  pantryQty?: number;
  totalNeeded?: number;
}

interface GrocerySection {
  name: string;
  items: GroceryItem[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ShoppingListView() {
  const [sections, setSections] = useState<GrocerySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Trip settings
  const [trips, setTrips] = useState<1 | 2>(1);
  const [activeTrip, setActiveTrip] = useState<"all" | "1" | "2">("all");
  const [shopDay, setShopDay] = useState(1);
  const [pantryDeductions, setPantryDeductions] = useState<{ name: string; qty: number }[]>([]);
  const [deducting, setDeducting] = useState(false);
  const [deducted, setDeducted] = useState(false);

  useEffect(() => {
    loadList();
  }, [activeTrip]);

  async function loadList() {
    setLoading(true);
    try {
      const weekParam = activeTrip === "all" ? "" : `&week=${activeTrip}`;
      const res = await fetch(`/api/shopping-list?${weekParam}`);
      const data = await res.json();
      setSections(data.sections ?? []);
      setPantryDeductions(data.pantryDeductions ?? []);
      setDeducted(false);
      // Pre-check pantry-covered items
      const pantryChecked = new Set<string>();
      for (const section of data.sections ?? []) {
        for (const item of section.items) {
          if (item.fromPantry) {
            pantryChecked.add(`${section.name}:${item.name}`);
          }
        }
      }
      setChecked(pantryChecked);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectTrips(count: 1 | 2) {
    setTrips(count);
    if (count === 1) {
      setActiveTrip("all");
    } else {
      setActiveTrip("1");
    }
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading shopping list...
      </div>
    );
  }

  if (sections.length === 0 && activeTrip === "all") {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-14 text-center">
          <ShoppingCart className="h-14 w-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-display text-lg font-semibold">
            No shopping list yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a meal plan first, then your shopping list will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Trip settings */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Grocery Trips</p>
            <div className="flex gap-2">
              <button
                onClick={() => selectTrips(1)}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
                  trips === 1
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                1 trip
              </button>
              <button
                onClick={() => selectTrips(2)}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
                  trips === 2
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                2 trips
              </button>
            </div>
          </div>

          {trips === 2 && (
            <>
              <div>
                <label className="text-xs font-medium">Shop day</label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Which day do you pick up groceries?
                </p>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setShopDay(i)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all",
                        shopDay === i
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTrip("1")}
                  className={cn(
                    "flex-1 rounded-xl border-2 p-3 text-left transition-all",
                    activeTrip === "1"
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/30"
                  )}
                >
                  <p className="text-sm font-semibold">Trip 1</p>
                  <p className="text-xs text-muted-foreground">
                    Week 1 (Days 1-8)
                  </p>
                </button>
                <button
                  onClick={() => setActiveTrip("2")}
                  className={cn(
                    "flex-1 rounded-xl border-2 p-3 text-left transition-all",
                    activeTrip === "2"
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/30"
                  )}
                >
                  <p className="text-sm font-semibold">Trip 2</p>
                  <p className="text-xs text-muted-foreground">
                    Week 2 (Days 9-16)
                  </p>
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {checkedCount} of {totalItems} items
              {activeTrip !== "all" && (
                <span className="text-muted-foreground ml-1">
                  (Trip {activeTrip})
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% done
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {pantryDeductions.length > 0 && !deducted && (
            <Button
              variant="outline"
              size="sm"
              disabled={deducting}
              onClick={async () => {
                setDeducting(true);
                try {
                  await fetch("/api/shopping-list", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deductions: pantryDeductions }),
                  });
                  setDeducted(true);
                } finally {
                  setDeducting(false);
                }
              }}
            >
              {deducting ? "Updating..." : "Use pantry items"}
            </Button>
          )}
          {deducted && (
            <span className="text-xs text-sage font-medium self-center">
              Pantry updated
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadList}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No items needed for this trip.
          </CardContent>
        </Card>
      ) : (
        sections.map((section) => (
          <Card key={section.name} className="border-border/60 overflow-hidden">
            <CardHeader className="bg-muted/40 py-3 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {section.items.map((item) => {
                  const key = `${section.name}:${item.name}`;
                  const isChecked = checked.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 text-sm transition-all duration-200 text-left",
                        isChecked
                          ? "text-muted-foreground/50 bg-muted/20"
                          : "hover:bg-accent/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
                          isChecked
                            ? "bg-primary border-primary scale-95"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {isChecked && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "flex-1 transition-all duration-200",
                          isChecked && "line-through"
                        )}
                      >
                        {item.name}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          isChecked
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.fromPantry ? (
                          <span className="text-sage">In pantry</span>
                        ) : (
                          <>{item.qty} {item.unit}</>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
