"use client";

import { RecipeList } from "@/components/recipe-list";

export default function RecipesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Recipes
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your recipe book. Add recipes by pasting URLs.
        </p>
      </div>
      <RecipeList />
    </div>
  );
}
