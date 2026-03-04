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

  return (
    <Badge variant={variant} className="text-xs" style={color ? { backgroundColor: `${color}20`, color } : {}}>
      {daysLeft}
    </Badge>
  );
}
