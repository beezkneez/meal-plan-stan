"use client";

import { ScheduleEditor } from "@/components/schedule-editor";

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Work Schedule
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set your 16-day rotation pattern and anchor date.
        </p>
      </div>
      <ScheduleEditor />
    </div>
  );
}
