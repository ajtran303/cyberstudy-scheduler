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
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_EVENTS = 3;

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

interface GridDay {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(refDate: string): GridDay[] {
  const ref = new Date(refDate);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const today = toISODate(new Date());

  const firstOfMonth = new Date(year, month, 1);
  // getDay() returns 0=Sun, we want Mon=0
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  const days: GridDay[] = [];
  // Always generate 6 rows (42 cells) for consistent height
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = toISODate(d);
    days.push({
      date: d,
      key,
      isCurrentMonth: d.getMonth() === month,
      isToday: key === today,
    });
  }
  return days;
}

function MonthGrid({
  events,
  refDate,
}: {
  events: CalendarEvent[];
  refDate: string;
}) {
  const days = buildMonthGrid(refDate);

  // Group events by ISO date for O(1) lookup
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    if (!event.date) continue;
    const key = toISODate(new Date(event.date));
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(event);
  }

  return (
    <div className="grid grid-cols-7 border-l border-t">
      {DAY_NAMES.map((name) => (
        <div
          key={name}
          className="border-r border-b px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
        >
          {name}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = eventsByDate[day.key] || [];
        const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
        const overflow = dayEvents.length - MAX_VISIBLE_EVENTS;

        return (
          <div
            key={day.key}
            className={`border-r border-b min-h-[5rem] p-1 ${
              !day.isCurrentMonth ? "bg-muted/30" : ""
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                day.isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : day.isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {day.date.getDate()}
            </span>
            <div className="mt-0.5 space-y-0.5">
              {visible.map((event) => (
                <div
                  key={`${event.type}-${event.id}`}
                  className="flex items-center gap-1 truncate"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: event.course.color }}
                  />
                  <span className="text-[10px] leading-tight truncate">
                    {event.name}
                  </span>
                </div>
              ))}
              {overflow > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  +{overflow} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventList({
  grouped,
  view,
}: {
  grouped: Record<string, CalendarEvent[]>;
  view: string;
}) {
  if (Object.keys(grouped).length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No events for this {view}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Topics with dates, assignments, and exams will show up on the calendar.
        </p>
      </div>
    );
  }
  return (
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
                className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-accent transition-colors sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: event.course.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.course.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-5 sm:pl-0">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {typeLabels[event.type]}
                  </Badge>
                  {event.daysLeft && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {event.daysLeft}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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

  // Group events by display date for the list view
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

  // Format header label
  const headerLabel = data
    ? view === "month"
      ? new Date(data.start).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : `${new Date(data.start).toLocaleDateString()} - ${new Date(data.end).toLocaleDateString()}`
    : "Loading...";

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
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
          <span className="text-sm font-medium min-w-0 flex-1 text-center sm:min-w-32 sm:flex-none">
            {headerLabel}
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
      ) : view === "month" ? (
        <>
          {/* Desktop: calendar grid */}
          <div className="hidden md:block">
            <MonthGrid events={data?.events || []} refDate={date} />
          </div>
          {/* Mobile: vertical list */}
          <div className="md:hidden">
            <EventList grouped={grouped} view={view} />
          </div>
        </>
      ) : (
        <EventList grouped={grouped} view={view} />
      )}
    </div>
  );
}
