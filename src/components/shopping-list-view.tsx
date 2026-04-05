"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  section: string;
}

interface GrocerySection {
  name: string;
  items: GroceryItem[];
}

export function ShoppingListView() {
  const [sections, setSections] = useState<GrocerySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping-list");
      const data = await res.json();
      setSections(data.sections ?? []);
      setChecked(new Set());
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

  if (sections.length === 0) {
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
      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {checkedCount} of {totalItems} items
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
        <Button variant="outline" size="sm" onClick={loadList}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {sections.map((section) => (
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
                      {item.qty} {item.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
