"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Save } from "lucide-react";
import type { ShiftType, ScheduleDay } from "@/types";

const SHIFT_CLASSES: Record<ShiftType, string> = {
  DAY: "shift-day",
  NIGHT: "shift-night",
  OFF: "shift-off",
};

const SHIFT_CYCLE: ShiftType[] = ["OFF", "DAY", "NIGHT"];

function getDefaultPattern(): ScheduleDay[] {
  return Array.from({ length: 16 }, (_, i) => ({
    day: i,
    shift: "OFF" as ShiftType,
  }));
}

export function ScheduleEditor() {
  const [pattern, setPattern] = useState<ScheduleDay[]>(getDefaultPattern);
  const [anchorDate, setAnchorDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data) => {
        if (data.pattern) {
          setPattern(JSON.parse(data.pattern));
          setAnchorDate(data.anchorDate?.split("T")[0] ?? anchorDate);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function cycleShift(dayIndex: number) {
    setPattern((prev) =>
      prev.map((d) => {
        if (d.day !== dayIndex) return d;
        const currentIdx = SHIFT_CYCLE.indexOf(d.shift);
        const nextShift = SHIFT_CYCLE[(currentIdx + 1) % SHIFT_CYCLE.length];
        return { ...d, shift: nextShift };
      })
    );
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: JSON.stringify(pattern),
          anchorDate: new Date(anchorDate).toISOString(),
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading schedule...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
          <CardTitle className="font-display text-xl">
            16-Day Rotation Pattern
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click each day to cycle: OFF → DAY → NIGHT
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {pattern.map((d) => (
              <button
                key={d.day}
                onClick={() => cycleShift(d.day)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95",
                  SHIFT_CLASSES[d.shift]
                )}
              >
                <span className="text-[10px] font-medium opacity-50 uppercase tracking-wider">
                  Day {d.day + 1}
                </span>
                <span className="text-base">{d.shift}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Legend:
            </span>
            <Badge variant="outline" className="shift-day text-xs font-medium">
              DAY
            </Badge>
            <Badge
              variant="outline"
              className="shift-night text-xs font-medium"
            >
              NIGHT
            </Badge>
            <Badge variant="outline" className="shift-off text-xs font-medium">
              OFF
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-xl">Anchor Date</CardTitle>
          <p className="text-sm text-muted-foreground">
            What calendar date is Day 1 of your current rotation?
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="w-52"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Schedule"}
      </Button>
    </div>
  );
}
