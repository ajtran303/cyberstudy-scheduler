"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  type: "topic" | "assignment" | "exam";
  name: string;
  date: string | null;
  course: { id: string; name: string; color: string };
  mastery?: string;
  status?: string;
  daysLeft?: string;
}

interface CalendarData {
  view: string;
  start: string;
  end: string;
  events: CalendarEvent[];
}

const typeLabels = { topic: "Topic", assignment: "Assignment", exam: "Exam" };

export function CalendarView() {
  const [view, setView] = useState<"week" | "month">("week");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/v1/calendar?view=${view}&date=${date}`);
      const json = await res.json();
      setData(json.data);
      setLoading(false);
    }
    load();
  }, [view, date]);

  function navigate(dir: number) {
    const d = new Date(date);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setDate(d.toISOString().split("T")[0]);
  }

  // Group events by date
  const grouped: Record<string, CalendarEvent[]> = {};
  if (data) {
    for (const event of data.events) {
      if (!event.date) continue;
      const key = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            Week
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
          >
            Month
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            &larr;
          </Button>
          <span className="text-sm font-medium min-w-32 text-center">
            {data
              ? `${new Date(data.start).toLocaleDateString()} - ${new Date(data.end).toLocaleDateString()}`
              : "Loading..."}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            &rarr;
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDate(new Date().toISOString().split("T")[0])}
          >
            Today
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No events for this {view}
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateLabel, events]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {dateLabel}
              </h3>
              <div className="space-y-1">
                {events.map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: event.course.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.course.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {typeLabels[event.type]}
                    </Badge>
                    {event.daysLeft && (
                      <span className="text-xs text-muted-foreground">
                        {event.daysLeft}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
