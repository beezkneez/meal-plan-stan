"use client";

import { RecipeView } from "@/components/recipe-view";
import { use } from "react";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RecipeView id={id} />;
}
