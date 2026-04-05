"use client";

import { ShoppingListView } from "@/components/shopping-list-view";

export default function ShoppingListPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Shopping List
        </h1>
        <p className="mt-1 text-muted-foreground">
          Organized by Walmart aisle. Generated from your meal plan.
        </p>
      </div>
      <ShoppingListView />
    </div>
  );
}
