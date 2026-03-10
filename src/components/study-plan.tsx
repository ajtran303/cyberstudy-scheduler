"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MASTERY_COLORS,
  MASTERY_LABELS,
  daysLeft,
} from "@/lib/utils";

interface CourseRef {
  id: string;
  name: string;
  color: string;
}

interface ThisWeekTopic {
  id: string;
  name: string;
  mastery: keyof typeof MASTERY_COLORS;
  date: string | null;
}

interface NearestDeadline {
  name: string;
  date: string | null;
  type: "assignment" | "exam";
}

interface ThisWeekGroup {
  course: CourseRef;
  nearestDeadline: NearestDeadline | null;
  topics: ThisWeekTopic[];
}

interface NotStartedTopic {
  id: string;
  name: string;
  date: string | null;
}

interface NotStartedGroup {
  course: CourseRef;
  topics: NotStartedTopic[];
}

interface StudyPlanData {
  weekStart: string;
  weekEnd: string;
  stats: {
    totalThisWeek: number;
    completedThisWeek: number;
    remainingThisWeek: number;
  };
  thisWeek: ThisWeekGroup[];
  notStarted: NotStartedGroup[];
}

function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + "T12:00:00Z");
  const end = new Date(weekEnd + "T12:00:00Z");
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  return `${start.toLocaleDateString("en-US", opts)}–${end.toLocaleDateString("en-US", opts)}`;
}

function daysLeftColor(dl: string): string {
  if (dl === "late") return "#ef4444";
  if (dl === "due" || dl === "tomorrow") return "#f59e0b";
  const n = parseInt(dl);
  if (!isNaN(n) && n <= 3) return "#f97316";
  return "#6b7280";
}

export function StudyPlan() {
  const [data, setData] = useState<StudyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notStartedExpanded, setNotStartedExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/study-plan");
      const json = await res.json();
      setData(json.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, thisWeek, notStarted } = data;
  const pct =
    stats.totalThisWeek > 0
      ? Math.round((stats.completedThisWeek / stats.totalThisWeek) * 100)
      : 0;

  const totalNotStarted = notStarted.reduce(
    (sum, g) => sum + g.topics.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Week header + progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            This Week ({formatWeekRange(data.weekStart, data.weekEnd)})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {stats.totalThisWeek} topic{stats.totalThisWeek !== 1 ? "s" : ""} &middot;{" "}
            {stats.completedThisWeek} completed &middot;{" "}
            {stats.remainingThisWeek} remaining
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {pct}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* This week's topics grouped by course */}
      {thisWeek.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No topics scheduled this week.
            </p>
          </CardContent>
        </Card>
      ) : (
        thisWeek.map((group) => {
          const dl = group.nearestDeadline?.date
            ? daysLeft(group.nearestDeadline.date)
            : null;

          return (
            <Card key={group.course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.course.color }}
                  />
                  <CardTitle className="text-sm font-semibold">
                    {group.course.name}
                  </CardTitle>
                </div>
                {group.nearestDeadline && dl && (
                  <div className="pl-[18px]">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: daysLeftColor(dl) + "20",
                        color: daysLeftColor(dl),
                      }}
                    >
                      {group.nearestDeadline.type === "exam" ? "Exam" : "Due"}:{" "}
                      {group.nearestDeadline.name} ({dl})
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0.5">
                  {group.topics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/dashboard/topics/${topic.id}`}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors min-h-[40px]"
                    >
                      <span className="text-sm truncate flex-1">
                        {topic.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[11px]"
                        style={{
                          backgroundColor:
                            MASTERY_COLORS[topic.mastery] + "20",
                          color: MASTERY_COLORS[topic.mastery],
                        }}
                      >
                        {MASTERY_LABELS[topic.mastery]}
                      </Badge>
                      {topic.date && (
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {formatShortDate(topic.date)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Not Started backlog */}
      {totalNotStarted > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <button
              onClick={() => setNotStartedExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
              aria-expanded={notStartedExpanded}
            >
              <CardTitle className="text-sm font-semibold">
                Not Started ({totalNotStarted} topic
                {totalNotStarted !== 1 ? "s" : ""})
              </CardTitle>
              <span className="text-muted-foreground text-xs shrink-0 ml-2">
                {notStartedExpanded ? "collapse" : "expand"}
              </span>
            </button>
          </CardHeader>
          {notStartedExpanded && (
            <CardContent className="pt-3 space-y-4">
              {notStarted.map((group) => (
                <div key={group.course.id}>
                  <div className="flex items-center gap-2 mb-1 px-3">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: group.course.color }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {group.course.name}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.topics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/dashboard/topics/${topic.id}`}
                        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors min-h-[40px]"
                      >
                        <span className="text-sm truncate flex-1">
                          {topic.name}
                        </span>
                        {topic.date && (
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {formatShortDate(topic.date)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
