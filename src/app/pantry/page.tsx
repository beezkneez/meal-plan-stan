"use client";

import { PantryTracker } from "@/components/pantry-tracker";

export default function PantryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Pantry
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your staples and know when to restock.
        </p>
      </div>
      <PantryTracker />
    </div>
  );
}
