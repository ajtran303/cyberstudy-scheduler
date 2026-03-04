"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MasteryBadge } from "@/components/mastery-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";

interface ReviewTopic {
  id: string;
  name: string;
  mastery: keyof typeof MASTERY_COLORS;
  lastReviewedAt: string | null;
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

  async function updateMastery(topicId: string, mastery: string) {
    setUpdating(topicId);
    await fetch(`/api/v1/topics/${topicId}/mastery`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery }),
    });
    setUpdating(null);
    // Refresh the list
    const params = new URLSearchParams({ sort });
    if (courseId) params.set("courseId", courseId);
    const res = await fetch(`/api/v1/review?${params}`);
    const json = await res.json();
    setTopics(json.data || []);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {topics.length} topics to review
        </h3>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mastery_priority">Mastery Priority</SelectItem>
            <SelectItem value="lastReviewedAt:asc">Oldest Reviewed</SelectItem>
            <SelectItem value="lastReviewedAt:desc">Recently Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : topics.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No topics to review</p>
      ) : (
        <div className="space-y-1">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: topic.course.color }}
              />
              <Link
                href={`/dashboard/topics/${topic.id}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{topic.name}</p>
                <p className="text-xs text-muted-foreground">
                  {topic.course.name}
                  {topic.lastReviewedAt && (
                    <> &middot; Reviewed {new Date(topic.lastReviewedAt).toLocaleDateString()}</>
                  )}
                </p>
              </Link>
              <MasteryBadge mastery={topic.mastery} size="sm" />
              <div className="flex gap-1 shrink-0">
                {MASTERY_LEVELS.map((level) => (
                  <Button
                    key={level}
                    variant="ghost"
                    size="sm"
                    disabled={updating === topic.id || topic.mastery === level}
                    onClick={() => updateMastery(topic.id, level)}
                    className="h-6 w-6 p-0 text-xs"
                    style={{ color: MASTERY_COLORS[level] }}
                    title={MASTERY_LABELS[level]}
                  >
                    {level[0]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
