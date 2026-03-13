"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SrsDueBadge } from "@/components/srs-due-badge";
import {
  MASTERY_COLORS,
  MASTERY_LABELS,
  formatDate,
} from "@/lib/utils";

/* ── Types: today-plan ────────────────────────────────── */

interface CourseRef {
  id: string;
  name: string;
  color: string;
}

interface SrsTopic {
  id: string;
  name: string;
  mastery: keyof typeof MASTERY_COLORS;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  course: CourseRef;
}

interface TodayData {
  stats: {
    studyMinutesToday: number;
    weeklyAvgMinutes: number;
    reviewsToday: number;
  };
  interleavedReviews: SrsTopic[];
  srsTotal: number;
}

/* ── Types: daily-briefing ────────────────────────────── */

interface BriefingDeadline {
  name: string;
  description: string | null;
  type: "assignment" | "exam";
  dueDate: string | null;
  daysLeft: number | null;
}

interface BriefingTopic {
  topicId: string;
  topicName: string;
  mastery: keyof typeof MASTERY_COLORS;
}

interface BriefingCourse {
  id: string;
  code: string | null;
  name: string;
  topics: BriefingTopic[];
  deadlines: BriefingDeadline[];
}

interface BriefingData {
  date: string;
  courses: BriefingCourse[];
}

/* ── Constants ────────────────────────────────────────── */

const RATING_BUTTONS = [
  { label: "Forgot", quality: 1, color: "#ef4444" },
  { label: "Hard", quality: 3, color: "#f97316" },
  { label: "Good", quality: 4, color: "#22c55e" },
  { label: "Easy", quality: 5, color: "#3b82f6" },
] as const;

function daysLeftColor(daysLeft: number | null): string {
  if (daysLeft === null) return "#6b7280";
  if (daysLeft < 0) return "#ef4444";
  if (daysLeft <= 1) return "#f59e0b";
  if (daysLeft <= 3) return "#f97316";
  return "#6b7280";
}

/* ── Component ────────────────────────────────────────── */

export function DailyBriefing() {
  const router = useRouter();
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const [todayRes, briefingRes] = await Promise.all([
      fetch("/api/v1/today-plan"),
      fetch("/api/v1/daily-briefing"),
    ]);
    const [todayJson, briefingJson] = await Promise.all([
      todayRes.json(),
      briefingRes.json(),
    ]);
    setTodayData(todayJson.data);
    setBriefingData(briefingJson.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function doReview(topicId: string, quality: number) {
    setUpdating(topicId);
    try {
      const res = await fetch(`/api/v1/topics/${topicId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to record review");
        return;
      }

      const json = await res.json();
      const nextDate = json.data?.nextReviewAt
        ? formatDate(json.data.nextReviewAt)
        : "unknown";
      toast.success(`Next review: ${nextDate}`);

      await load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setUpdating(null);
    }
  }

  // Build course color map from today-plan's SRS data
  const courseColorMap = new Map<string, string>();
  if (todayData) {
    for (const topic of todayData.interleavedReviews) {
      courseColorMap.set(topic.course.id, topic.course.color);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!todayData || !briefingData) return null;

  const statItems = [
    { label: "Study Time Today", value: `${todayData.stats.studyMinutesToday}m` },
    { label: "7-Day Average", value: `${todayData.stats.weeklyAvgMinutes}m` },
    { label: "Reviews Completed", value: String(todayData.stats.reviewsToday) },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/50 p-4 text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* SRS Reviews Due */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Flashcard Reviews Due
            {todayData.srsTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {todayData.srsTotal}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayData.interleavedReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All caught up!
            </p>
          ) : (
            <div className="space-y-1">
              {todayData.interleavedReviews.map((topic) => (
                <div
                  key={topic.id}
                  className="flex flex-col gap-1 rounded-md px-3 py-2.5 hover:bg-accent transition-colors sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: topic.course.color }}
                    />
                    <Link
                      href={`/dashboard/topics/${topic.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="text-sm font-medium truncate">
                        {topic.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {topic.course.name}
                      </p>
                    </Link>
                    <SrsDueBadge
                      nextReviewAt={topic.nextReviewAt}
                      mastery={topic.mastery}
                    />
                  </div>
                  <div className="flex items-center gap-1 pl-5 sm:pl-0">
                    {RATING_BUTTONS.map((btn) => (
                      <button
                        key={btn.label}
                        disabled={updating === topic.id}
                        onClick={() => doReview(topic.id, btn.quality)}
                        className="inline-flex items-center justify-center rounded-full px-3 min-h-[44px] text-xs font-medium transition-all opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-default disabled:opacity-30"
                        style={{
                          color: btn.color,
                          border: `1px solid ${btn.color}`,
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Briefings */}
      {briefingData.courses.map((course) => {
        const color = courseColorMap.get(course.id) ?? "#6366f1";
        return (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 min-w-0">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">
                  {course.code ? `${course.code} — ` : ""}
                  {course.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deadlines */}
              {course.deadlines.length > 0 && (
                <div className="space-y-1">
                  {course.deadlines.map((dl, i) => {
                    const dlColor = daysLeftColor(dl.daysLeft);
                    return (
                      <div
                        key={`${dl.type}-${i}`}
                        className="flex items-start gap-3 rounded-md px-3 py-2 bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {dl.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dl.type === "assignment" ? "Assignment" : "Exam"}
                            {dl.dueDate && <> &middot; {dl.dueDate}</>}
                          </p>
                          {dl.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {dl.description}
                            </p>
                          )}
                        </div>
                        {dl.daysLeft !== null && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                            style={{
                              backgroundColor: dlColor + "20",
                              color: dlColor,
                            }}
                          >
                            {dl.daysLeft < 0
                              ? "late"
                              : dl.daysLeft === 0
                                ? "due"
                                : dl.daysLeft === 1
                                  ? "tomorrow"
                                  : `${dl.daysLeft} days`}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Topics */}
              {course.topics.length > 0 && (() => {
                const active = course.topics.filter((t) => t.mastery !== "NOT_STARTED");
                const notStarted = course.topics.filter((t) => t.mastery === "NOT_STARTED");
                const isExpanded = expandedCourses.has(course.id);
                const NOT_STARTED_LIMIT = 3;
                const visibleNotStarted = isExpanded
                  ? notStarted
                  : notStarted.slice(0, NOT_STARTED_LIMIT);
                const hiddenCount = notStarted.length - NOT_STARTED_LIMIT;

                return (
                  <div className="space-y-1">
                    {[...active, ...visibleNotStarted].map((topic) => (
                      <div
                        key={topic.topicId}
                        className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent transition-colors"
                      >
                        <Link
                          href={`/dashboard/topics/${topic.topicId}`}
                          className="text-sm truncate flex-1 hover:underline"
                        >
                          {topic.topicName}
                        </Link>
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
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        onClick={() =>
                          setExpandedCourses((prev) => {
                            const next = new Set(prev);
                            if (next.has(course.id)) next.delete(course.id);
                            else next.add(course.id);
                            return next;
                          })
                        }
                        className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
                      >
                        {isExpanded
                          ? "show less"
                          : `+${hiddenCount} more not started`}
                      </button>
                    )}
                  </div>
                );
              })()}

              {course.topics.length === 0 && course.deadlines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No topics or deadlines
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {briefingData.courses.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No active topics or upcoming deadlines.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
