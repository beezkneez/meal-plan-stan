"use client";

import { PreferencesForm } from "@/components/preferences-form";

export default function SettingsPage() {
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
      <PreferencesForm />
    </div>
  );
}
