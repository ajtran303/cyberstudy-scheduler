"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MASTERY_COLORS, MASTERY_LABELS, formatDate } from "@/lib/utils";
import { SrsDueBadge } from "@/components/srs-due-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewTopic {
  id: string;
  name: string;
  mastery: keyof typeof MASTERY_COLORS;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  course: { id: string; name: string; color: string };
}

interface ReviewTableProps {
  courseId?: string;
}

const MASTERY_LEVELS = ["EXPOSED", "SCANNING", "HARDENED", "CLASSIFIED"] as const;

const RATING_BUTTONS = [
  { label: "Forgot", quality: 1, color: "#ef4444" },
  { label: "Hard", quality: 3, color: "#f97316" },
  { label: "Good", quality: 4, color: "#22c55e" },
  { label: "Easy", quality: 5, color: "#3b82f6" },
] as const;

function isDue(nextReviewAt: string | null, mastery: string): boolean {
  if (mastery === "EXPOSED" || mastery === "CLASSIFIED") return false;
  if (!nextReviewAt) return true;
  return new Date(nextReviewAt) <= new Date();
}

export function ReviewTable({ courseId }: ReviewTableProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<ReviewTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("mastery_priority");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ sort });
      if (courseId) params.set("courseId", courseId);
      const res = await fetch(`/api/v1/review?${params}`);
      const json = await res.json();
      setTopics(json.data || []);
      setLoading(false);
    }
    load();
  }, [sort, courseId]);

  async function doReview(topicId: string, quality: number) {
    setUpdating(topicId);
    const oldTopics = [...topics];

    // Optimistic: mark as just reviewed so rating buttons disappear
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, lastReviewedAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + 86400000).toISOString() }
          : t
      )
    );

    try {
      const res = await fetch(`/api/v1/topics/${topicId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });

      if (!res.ok) {
        setTopics(oldTopics);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to record review");
        return;
      }

      const json = await res.json();
      const nextDate = json.data?.nextReviewAt
        ? formatDate(json.data.nextReviewAt)
        : "unknown";
      toast.success(`Next review: ${nextDate}`);

      // Refresh with actual server data
      const params = new URLSearchParams({ sort });
      if (courseId) params.set("courseId", courseId);
      const listRes = await fetch(`/api/v1/review?${params}`);
      const listJson = await listRes.json();
      setTopics(listJson.data || []);
      router.refresh();
    } catch {
      setTopics(oldTopics);
      toast.error("Network error");
    } finally {
      setUpdating(null);
    }
  }

  function confirmMasteryUpdate(topicId: string, mastery: string) {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;
    const oldMastery = topic.mastery;
    const label = MASTERY_LABELS[mastery as keyof typeof MASTERY_LABELS];

    toast(`Change mastery to ${label}?`, {
      action: {
        label: "Confirm",
        onClick: () => doUpdateMastery(topicId, mastery, oldMastery),
      },
      duration: 5000,
    });
  }

  async function doUpdateMastery(topicId: string, mastery: string, oldMastery: string) {
    setUpdating(topicId);
    const oldTopics = [...topics];

    // Optimistic update
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, mastery: mastery as keyof typeof MASTERY_COLORS } : t
      )
    );

    try {
      const res = await fetch(`/api/v1/topics/${topicId}/mastery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastery }),
      });

      if (!res.ok) {
        setTopics(oldTopics);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update mastery");
        return;
      }

      toast.success("Mastery updated", {
        action: {
          label: "Undo",
          onClick: () => doUpdateMastery(topicId, oldMastery, mastery),
        },
      });
      router.refresh();
    } catch {
      setTopics(oldTopics);
      toast.error("Network error");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {topics.length} topics to review
        </h3>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mastery_priority">Mastery Priority</SelectItem>
            <SelectItem value="lastReviewedAt:asc">Oldest Reviewed</SelectItem>
            <SelectItem value="lastReviewedAt:desc">Recently Reviewed</SelectItem>
            <SelectItem value="srs">SRS Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-14 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No topics to review</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add topics to your courses and they&apos;ll appear here sorted by mastery priority.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {topics.map((topic) => (
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
                  <p className="text-sm font-medium truncate">{topic.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {topic.course.name}
                    {topic.lastReviewedAt && (
                      <> &middot; Reviewed {formatDate(topic.lastReviewedAt)}</>
                    )}
                  </p>
                </Link>
                <SrsDueBadge nextReviewAt={topic.nextReviewAt} mastery={topic.mastery} />
              </div>
              {isDue(topic.nextReviewAt, topic.mastery) && (
                <div className="grid grid-cols-2 gap-1 pl-5 sm:pl-0 sm:flex sm:items-center">
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
              )}
              <div className="grid grid-cols-2 gap-1 pl-5 sm:pl-0 sm:flex sm:items-center sm:gap-1.5">
                {MASTERY_LEVELS.map((level) => {
                  const isActive = topic.mastery === level;
                  return (
                    <button
                      key={level}
                      disabled={updating === topic.id || isActive}
                      onClick={() => confirmMasteryUpdate(topic.id, level)}
                      className={`inline-flex items-center justify-center rounded-full px-3 min-h-[44px] text-xs font-medium transition-all ${
                        isActive
                          ? "text-white"
                          : "opacity-60 hover:opacity-100"
                      } focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-default`}
                      style={{
                        backgroundColor: isActive ? MASTERY_COLORS[level] : "transparent",
                        color: isActive ? "white" : MASTERY_COLORS[level],
                        border: `1px solid ${MASTERY_COLORS[level]}`,
                      }}
                    >
                      {MASTERY_LABELS[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
