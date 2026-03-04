"use client";

import { Badge } from "@/components/ui/badge";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";

interface MasteryBadgeProps {
  mastery: keyof typeof MASTERY_COLORS;
  size?: "sm" | "default";
}

export function MasteryBadge({ mastery, size = "default" }: MasteryBadgeProps) {
  const color = MASTERY_COLORS[mastery];
  const label = MASTERY_LABELS[mastery];

  return (
    <Badge
      className={`${size === "sm" ? "text-xs px-1.5 py-0" : ""} border-0`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </Badge>
  );
}
