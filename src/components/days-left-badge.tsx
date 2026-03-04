"use client";

import { Badge } from "@/components/ui/badge";

interface DaysLeftBadgeProps {
  daysLeft: string;
}

export function DaysLeftBadge({ daysLeft }: DaysLeftBadgeProps) {
  if (!daysLeft) return null;

  const variant = daysLeft === "late"
    ? "destructive"
    : daysLeft === "due" || daysLeft === "tomorrow"
    ? "default"
    : "secondary";

  const color = daysLeft === "late"
    ? "#ef4444"
    : daysLeft === "due"
    ? "#f59e0b"
    : daysLeft === "tomorrow"
    ? "#f59e0b"
    : undefined;

  const tooltip = daysLeft === "late"
    ? "Past the due date"
    : daysLeft === "due"
    ? "Due today"
    : daysLeft === "tomorrow"
    ? "Due tomorrow"
    : `Due in ${daysLeft}`;

  return (
    <Badge variant={variant} className="text-xs" title={tooltip} style={color ? { backgroundColor: `${color}20`, color } : {}}>
      {daysLeft}
    </Badge>
  );
}
