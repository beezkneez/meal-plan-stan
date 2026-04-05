"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GoogleCalendar {
  id: string;
  name: string;
  color: string;
  primary: boolean;
  synced: boolean;
  enabled: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  calendarName: string;
  calendarColor: string;
}

export function CalendarPicker() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCalendars();
  }, []);

  async function loadCalendars() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calendars");
      if (res.status === 403) {
        setError("Please sign in with Google first to access your calendars.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load calendars.");
        return;
      }
      const data = await res.json();
      setCalendars(data);

      // If any are enabled, load events
      if (data.some((c: GoogleCalendar) => c.enabled)) {
        loadEvents();
      }
    } catch {
      setError("Network error loading calendars.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/calendars/events?days=16");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoadingEvents(false);
    }
  }

  async function toggleCalendar(cal: GoogleCalendar) {
    setToggling(cal.id);
    const newEnabled = !cal.enabled;

    try {
      await fetch("/api/calendars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: cal.id,
          calendarName: cal.name,
          color: cal.color,
          enabled: newEnabled,
        }),
      });

      setCalendars((prev) =>
        prev.map((c) =>
          c.id === cal.id ? { ...c, enabled: newEnabled, synced: true } : c
        )
      );

      // Reload events after toggling
      setTimeout(loadEvents, 300);
    } finally {
      setToggling(null);
    }
  }

  function formatEventTime(event: CalendarEvent) {
    if (event.start?.dateTime) {
      return format(new Date(event.start.dateTime), "EEE, MMM d 'at' h:mm a");
    }
    if (event.start?.date) {
      return format(new Date(event.start.date + "T12:00:00"), "EEE, MMM d") + " (all day)";
    }
    return "";
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading your Google calendars...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = calendars.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Calendar list */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-xl">
                Your Calendars
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={loadCalendars}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Toggle the calendars you want Stan to consider when planning meals.
            {enabledCount > 0 && (
              <span className="text-primary font-medium">
                {" "}
                {enabledCount} calendar{enabledCount > 1 ? "s" : ""} synced.
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {calendars.map((cal) => (
              <button
                key={cal.id}
                onClick={() => toggleCalendar(cal)}
                disabled={toggling === cal.id}
                className={cn(
                  "flex items-center gap-4 w-full px-5 py-4 text-left transition-all duration-200",
                  cal.enabled
                    ? "bg-primary/5"
                    : "hover:bg-accent/20"
                )}
              >
                {/* Color dot */}
                <div
                  className={cn(
                    "h-4 w-4 rounded-full shrink-0 transition-all",
                    cal.enabled && "ring-2 ring-offset-2 ring-offset-background"
                  )}
                  style={{
                    backgroundColor: cal.color,
                    ...(cal.enabled ? { "--tw-ring-color": cal.color } as React.CSSProperties : {}),
                  }}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {cal.name}
                    {cal.primary && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (primary)
                      </span>
                    )}
                  </p>
                </div>

                {/* Toggle indicator */}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-200",
                    cal.enabled
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}
                >
                  {toggling === cal.id ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    cal.enabled && (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    )
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events preview */}
      {enabledCount > 0 && (
        <Card className="border-border/60 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-xl">
                Upcoming Events (Next 16 Days)
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              These events will be considered when generating your meal plan.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No upcoming events in the next 16 days.
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={`${event.calendarName}-${event.id}`}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <div
                      className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: event.calendarColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.summary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event)}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium shrink-0 mt-1">
                      {event.calendarName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
