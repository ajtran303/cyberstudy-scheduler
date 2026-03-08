"use client";

import { Badge } from "@/components/ui/badge";

interface SrsDueBadgeProps {
  nextReviewAt: string | null;
  mastery?: string;
}

export function SrsDueBadge({ nextReviewAt, mastery }: SrsDueBadgeProps) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  // Non-SRS mastery levels: no badge
  if (mastery === "NOT_STARTED" || mastery === "MASTERED") {
    return null;
  }

  if (!nextReviewAt) {
    return (
      <Badge
        variant="destructive"
        className="shrink-0 text-xs"
        style={{ backgroundColor: "#ef444420", color: "#ef4444" }}
      >
        due now
      </Badge>
    );
  }

  const reviewDate = new Date(nextReviewAt);
  const reviewDay = Date.UTC(reviewDate.getUTCFullYear(), reviewDate.getUTCMonth(), reviewDate.getUTCDate());
  const diffMs = reviewDay - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const ago = Math.abs(diffDays);
    return (
      <Badge
        variant="destructive"
        className="shrink-0 text-xs"
        style={{ backgroundColor: "#ef444420", color: "#ef4444" }}
      >
        due {ago}d ago
      </Badge>
    );
  }

  if (diffDays === 0) {
    return (
      <Badge
        variant="default"
        className="shrink-0 text-xs"
        style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}
      >
        due today
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="shrink-0 text-xs">
      in {diffDays}d
    </Badge>
  );
}
