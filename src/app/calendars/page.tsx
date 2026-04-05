"use client";

import { CalendarPicker } from "@/components/calendar-picker";

export default function CalendarsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Calendars
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sync your Google calendars so Stan knows your schedule, activities,
          and commitments.
        </p>
      </div>
      <CalendarPicker />
    </div>
  );
}
