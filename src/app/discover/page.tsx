"use client";

import { RecipeDiscovery } from "@/components/recipe-discovery";

export default function DiscoverPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Discover Recipes
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find new meal ideas. Approve the ones you like to add them to your
          recipe book.
        </p>
      </div>
      <RecipeDiscovery />
    </div>
  );
}
