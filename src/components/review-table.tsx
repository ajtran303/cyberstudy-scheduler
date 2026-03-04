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
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";
import { SrsDueBadge } from "@/components/srs-due-badge";

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
    try {
      const res = await fetch(`/api/v1/topics/${topicId}/mastery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastery }),
      });

      if (!res.ok) {
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
      // Refresh the list
      const params = new URLSearchParams({ sort });
      if (courseId) params.set("courseId", courseId);
      const listRes = await fetch(`/api/v1/review?${params}`);
      const json = await listRes.json();
      setTopics(json.data || []);
      router.refresh();
    } catch {
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
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
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
                      <> &middot; Reviewed {new Date(topic.lastReviewedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </Link>
                <SrsDueBadge nextReviewAt={topic.nextReviewAt} />
              </div>
              <div className="flex items-center gap-1.5 pl-5 sm:pl-0 flex-wrap">
                {MASTERY_LEVELS.map((level) => {
                  const isActive = topic.mastery === level;
                  return (
                    <button
                      key={level}
                      disabled={updating === topic.id || isActive}
                      onClick={() => confirmMasteryUpdate(topic.id, level)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                        isActive
                          ? "text-white"
                          : "opacity-40 hover:opacity-100"
                      } disabled:cursor-default`}
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
