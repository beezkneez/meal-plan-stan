"use client";

import { useState } from "react";
import { PreferencesForm } from "@/components/preferences-form";
import { HouseholdManager } from "@/components/household-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function SettingsPage() {
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState("");

  async function cleanupRecipes() {
    setCleaning(true);
    setCleanResult("");
    try {
      const res = await fetch("/api/recipes/cleanup", { method: "POST" });
      const data = await res.json();
      setCleanResult(
        `Cleaned ${data.cleaned} of ${data.total} recipes`
      );
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set your eating style, dislikes, and meal preferences.
        </p>
      </div>
      <HouseholdManager />
      <PreferencesForm />

      {/* Tools */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="font-display text-xl">Tools</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={cleanupRecipes}
              disabled={cleaning}
            >
              {cleaning ? "Cleaning..." : "Clean Up Recipes"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Strips HTML tags from recipe ingredients and steps
            </p>
          </div>
          {cleanResult && (
            <p className="text-sm text-sage font-medium">{cleanResult}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
