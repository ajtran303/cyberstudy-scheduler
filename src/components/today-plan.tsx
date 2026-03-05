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
  daysLeft,
} from "@/lib/utils";

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

interface SrsGroup {
  course: CourseRef;
  topics: SrsTopic[];
}

interface Deadline {
  id: string;
  type: "assignment" | "exam";
  name: string;
  date: string | null;
  status: string;
  course: CourseRef;
}

interface ExamPrepTopic {
  id: string;
  name: string;
  mastery: keyof typeof MASTERY_COLORS;
  nextReviewAt: string | null;
}

interface ExamPrepGroup {
  exam: { id: string; name: string; date: string | null; course: CourseRef };
  topics: ExamPrepTopic[];
  topicsNeedingReview: number;
}

interface TodayData {
  stats: {
    studyMinutesToday: number;
    weeklyAvgMinutes: number;
    reviewsToday: number;
  };
  srsReviews: SrsGroup[];
  srsTotal: number;
  deadlines: Deadline[];
  examPrep: ExamPrepGroup[];
}

const RATING_BUTTONS = [
  { label: "Forgot", quality: 1, color: "#ef4444" },
  { label: "Hard", quality: 3, color: "#f97316" },
  { label: "Good", quality: 4, color: "#22c55e" },
  { label: "Easy", quality: 5, color: "#3b82f6" },
] as const;

export function TodayPlan() {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetch("/api/v1/today-plan");
    const json = await res.json();
    setData(json.data);
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

      // Refresh data
      await load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setUpdating(null);
    }
  }

  function toggleExam(examId: string) {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  }

  function daysLeftColor(dl: string): string {
    if (dl === "late") return "#ef4444";
    if (dl === "due" || dl === "tomorrow") return "#f59e0b";
    const n = parseInt(dl);
    if (!isNaN(n) && n <= 3) return "#f97316";
    return "#6b7280";
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Daily Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Study Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.studyMinutesToday}m</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Avg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.weeklyAvgMinutes}m/day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviews Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.reviewsToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* SRS Reviews Due */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            SRS Reviews Due
            {data.srsTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {data.srsTotal}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.srsReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All caught up!
            </p>
          ) : (
            <div className="space-y-4">
              {data.srsReviews.map((group) => (
                <div key={group.course.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: group.course.color }}
                    />
                    <span className="text-sm font-medium">
                      {group.course.name}
                    </span>
                  </div>
                  <div className="space-y-1 pl-4">
                    {group.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-accent transition-colors sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Link
                            href={`/dashboard/topics/${topic.id}`}
                            className="min-w-0 flex-1"
                          >
                            <p className="text-sm font-medium truncate">
                              {topic.name}
                            </p>
                          </Link>
                          <SrsDueBadge
                            nextReviewAt={topic.nextReviewAt}
                            mastery={topic.mastery}
                          />
                        </div>
                        <div className="flex items-center gap-1 pl-0 sm:pl-0">
                          {RATING_BUTTONS.map((btn) => (
                            <button
                              key={btn.label}
                              disabled={updating === topic.id}
                              onClick={() => doReview(topic.id, btn.quality)}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-all opacity-60 hover:opacity-100 disabled:cursor-default disabled:opacity-30"
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      {data.deadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.deadlines.map((item) => {
                const dl = item.date ? daysLeft(item.date) : "";
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.course.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.course.name} &middot;{" "}
                        {item.type === "assignment" ? "Assignment" : "Exam"}
                        {item.date && <> &middot; {formatDate(item.date)}</>}
                      </p>
                    </div>
                    {dl && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs"
                        style={{
                          backgroundColor: daysLeftColor(dl) + "20",
                          color: daysLeftColor(dl),
                        }}
                      >
                        {dl}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Prep */}
      {data.examPrep.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exam Prep</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.examPrep.map((ep) => {
              const dl = ep.exam.date ? daysLeft(ep.exam.date) : "";
              const isExpanded = expandedExams.has(ep.exam.id);
              return (
                <div
                  key={ep.exam.id}
                  className="rounded-md border p-3"
                >
                  <button
                    onClick={() => toggleExam(ep.exam.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ep.exam.course.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ep.exam.name}
                          {dl && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              in {dl}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ep.topics.length} topics &middot;{" "}
                          {ep.topicsNeedingReview} need review
                        </p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {isExpanded ? "collapse" : "expand"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1 pl-4">
                      {ep.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-2 py-1"
                        >
                          <Link
                            href={`/dashboard/topics/${topic.id}`}
                            className="text-sm truncate flex-1 hover:underline"
                          >
                            {topic.name}
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
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
