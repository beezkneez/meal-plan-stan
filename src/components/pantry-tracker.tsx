"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Minus, Trash2, AlertTriangle, Package, Zap, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface PantryItemData {
  id: string;
  name: string;
  category: string;
  unit: string;
  qtyOnHand: number;
  qtyMinimum: number;
  walmartUrl?: string | null;
  walmartUrlBackup?: string | null;
  walmartPricePreference?: string;
}

const CATEGORIES = [
  "protein",
  "dairy",
  "grain",
  "produce",
  "spice",
  "oil",
  "frozen",
  "canned",
  "other",
];

const QUICK_START_PANTRY = [
  { name: "Canola oil", category: "oil", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Olive oil", category: "oil", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Butter", category: "dairy", unit: "lb", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Salt", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Black pepper", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Garlic powder", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Onion powder", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Paprika", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Chili powder", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Italian seasoning", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Cumin", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Cinnamon", category: "spice", unit: "container", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "White rice", category: "grain", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Pasta (spaghetti)", category: "grain", unit: "box", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Pasta (penne)", category: "grain", unit: "box", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Flour (all-purpose)", category: "grain", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Sugar", category: "grain", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Brown sugar", category: "grain", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Oats", category: "grain", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Bread", category: "grain", unit: "loaf", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Tortillas", category: "grain", unit: "pack", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Soy sauce", category: "canned", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Ketchup", category: "canned", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Mustard", category: "canned", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Mayo", category: "canned", unit: "jar", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Hot sauce", category: "canned", unit: "bottle", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Tomato sauce", category: "canned", unit: "can", qtyOnHand: 3, qtyMinimum: 2 },
  { name: "Diced tomatoes", category: "canned", unit: "can", qtyOnHand: 3, qtyMinimum: 2 },
  { name: "Chicken broth", category: "canned", unit: "carton", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Canned beans (black)", category: "canned", unit: "can", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Canned beans (kidney)", category: "canned", unit: "can", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Canned corn", category: "canned", unit: "can", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Eggs", category: "dairy", unit: "dozen", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Milk", category: "dairy", unit: "jug", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Cheddar cheese", category: "dairy", unit: "block", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Mozzarella cheese", category: "dairy", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Sour cream", category: "dairy", unit: "tub", qtyOnHand: 1, qtyMinimum: 0 },
  { name: "Onions", category: "produce", unit: "count", qtyOnHand: 4, qtyMinimum: 2 },
  { name: "Garlic", category: "produce", unit: "head", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Potatoes", category: "produce", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Frozen chicken breasts", category: "frozen", unit: "bag", qtyOnHand: 1, qtyMinimum: 1 },
  { name: "Frozen ground beef", category: "frozen", unit: "lb", qtyOnHand: 2, qtyMinimum: 1 },
  { name: "Frozen vegetables (mixed)", category: "frozen", unit: "bag", qtyOnHand: 2, qtyMinimum: 1 },
];

const CATEGORY_COLORS: Record<string, string> = {
  protein: "bg-terracotta/10 text-terracotta border-terracotta/20",
  dairy: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  grain: "bg-amber-warm/10 text-amber-deep border-amber-warm/20",
  produce: "bg-sage/10 text-sage border-sage/20",
  spice: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  oil: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
  frozen: "bg-indigo-shift/10 text-indigo-shift border-indigo-shift/20",
  canned: "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-900/30 dark:text-stone-400 dark:border-stone-700",
  other: "bg-muted text-muted-foreground border-border",
};

export function PantryTracker() {
  const [items, setItems] = useState<PantryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "other",
    unit: "count",
    qtyOnHand: 0,
    qtyMinimum: 0,
  });

  useEffect(() => {
    fetch("/api/pantry")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addItem() {
    const res = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item]);
      setNewItem({
        name: "",
        category: "other",
        unit: "count",
        qtyOnHand: 0,
        qtyMinimum: 0,
      });
      setShowAdd(false);
    }
  }

  async function updateQty(id: string, qtyOnHand: number) {
    await fetch("/api/pantry", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, qtyOnHand }),
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qtyOnHand } : i))
    );
  }

  async function updateWalmartFields(
    id: string,
    fields: Partial<Pick<PantryItemData, "walmartUrl" | "walmartUrlBackup" | "walmartPricePreference">>
  ) {
    await fetch("/api/pantry", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...fields } : i))
    );
  }

  async function deleteItem(id: string) {
    await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [quickStarting, setQuickStarting] = useState(false);

  async function quickStartPantry() {
    setQuickStarting(true);
    try {
      const existingNames = new Set(items.map((i) => i.name.toLowerCase()));
      const toAdd = QUICK_START_PANTRY.filter(
        (p) => !existingNames.has(p.name.toLowerCase())
      );

      const results = await Promise.all(
        toAdd.map((item) =>
          fetch("/api/pantry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          }).then((r) => r.json())
        )
      );

      setItems((prev) => [...prev, ...results]);
    } finally {
      setQuickStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading pantry...
      </div>
    );
  }

  const lowStock = items.filter((i) => i.qtyOnHand <= i.qtyMinimum);

  return (
    <div className="space-y-5">
      {lowStock.length > 0 && (
        <Card className="border-amber-warm/40 bg-gradient-to-r from-amber-warm/10 to-transparent">
          <CardContent className="py-3.5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-warm/20">
              <AlertTriangle className="h-4 w-4 text-amber-deep" />
            </div>
            <span className="text-sm font-medium">
              <span className="text-amber-deep">{lowStock.length}</span>{" "}
              item{lowStock.length > 1 ? "s" : ""} low on stock:{" "}
              <span className="text-muted-foreground">
                {lowStock.map((i) => i.name).join(", ")}
              </span>
            </span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
        {items.length < 10 && (
          <Button
            variant="outline"
            onClick={quickStartPantry}
            disabled={quickStarting}
          >
            <Zap className="h-4 w-4 mr-2" />
            {quickStarting ? "Adding..." : "Quick Start Pantry"}
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="py-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Input
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
              />
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Unit (lb, oz, count)"
                value={newItem.unit}
                onChange={(e) =>
                  setNewItem({ ...newItem, unit: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Qty on hand"
                value={newItem.qtyOnHand || ""}
                onChange={(e) =>
                  setNewItem({ ...newItem, qtyOnHand: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                placeholder="Min qty"
                value={newItem.qtyMinimum || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    qtyMinimum: Number(e.target.value),
                  })
                }
              />
            </div>
            <Button onClick={addItem} disabled={!newItem.name}>
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-14 text-center">
            <Package className="h-14 w-14 mx-auto mb-4 text-muted-foreground/20" />
            <p className="font-display text-lg font-semibold">
              Pantry is empty
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your staples to track them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">On Hand</TableHead>
                <TableHead className="font-semibold">Min</TableHead>
                <TableHead className="font-semibold">Unit</TableHead>
                <TableHead className="font-semibold w-16">Walmart</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow = item.qtyOnHand <= item.qtyMinimum;
                return (
                  <React.Fragment key={item.id}>
                  <TableRow
                    className={isLow ? "bg-amber-warm/5" : ""}
                  >
                    <TableCell className="font-medium">
                      {isLow && (
                        <AlertTriangle className="inline h-3.5 w-3.5 text-amber-deep mr-1.5 -mt-0.5" />
                      )}
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other}`}
                      >
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            updateQty(
                              item.id,
                              Math.max(0, Math.round((item.qtyOnHand - 0.5) * 10) / 10)
                            )
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          step="0.5"
                          value={item.qtyOnHand}
                          onChange={(e) =>
                            updateQty(item.id, Number(e.target.value))
                          }
                          className="w-16 h-8 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            updateQty(
                              item.id,
                              Math.round((item.qtyOnHand + 0.5) * 10) / 10
                            )
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.qtyMinimum}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${item.walmartUrl ? "text-blue-500 hover:text-blue-700" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
                        onClick={() =>
                          setExpandedItem(
                            expandedItem === item.id ? null : item.id
                          )
                        }
                        title={item.walmartUrl ? "Walmart linked" : "Add Walmart link"}
                      >
                        {expandedItem === item.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/40 hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedItem === item.id && (
                    <TableRow className="bg-accent/20">
                      <TableCell colSpan={7} className="py-3">
                        <div className="space-y-3 max-w-lg">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Primary Walmart.ca Link
                            </label>
                            <Input
                              placeholder="https://www.walmart.ca/ip/..."
                              value={item.walmartUrl ?? ""}
                              onChange={(e) =>
                                updateWalmartFields(item.id, {
                                  walmartUrl: e.target.value || null,
                                })
                              }
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Backup Walmart.ca Link
                            </label>
                            <Input
                              placeholder="https://www.walmart.ca/ip/..."
                              value={item.walmartUrlBackup ?? ""}
                              onChange={(e) =>
                                updateWalmartFields(item.id, {
                                  walmartUrlBackup: e.target.value || null,
                                })
                              }
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              When both links are set, use:
                            </label>
                            <select
                              className="mt-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                              value={item.walmartPricePreference ?? "best_price"}
                              onChange={(e) =>
                                updateWalmartFields(item.id, {
                                  walmartPricePreference: e.target.value,
                                })
                              }
                            >
                              <option value="best_price">Best price between the two</option>
                              <option value="backup_when_oos">Backup only when primary is out of stock</option>
                            </select>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
