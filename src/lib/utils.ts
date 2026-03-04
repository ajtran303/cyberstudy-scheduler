import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysLeft(date: Date | string | null | undefined): string {
  if (!date) return "";
  const target = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "late";
  if (diffDays === 0) return "due";
  if (diffDays === 1) return "tomorrow";
  return `${diffDays} days`;
}

export function addDaysLeft<T extends { dueDate?: Date | null; date?: Date | null }>(
  item: T
): T & { daysLeft: string } {
  const dateField = "dueDate" in item ? item.dueDate : item.date;
  return { ...item, daysLeft: daysLeft(dateField) };
}

export const MASTERY_ORDER = {
  EXPOSED: 0,
  SCANNING: 1,
  HARDENED: 2,
  CLASSIFIED: 3,
} as const;

export const MASTERY_COLORS = {
  EXPOSED: "#ef4444",
  SCANNING: "#f59e0b",
  HARDENED: "#10b981",
  CLASSIFIED: "#8b5cf6",
} as const;

export const MASTERY_LABELS = {
  EXPOSED: "Exposed",
  SCANNING: "Scanning",
  HARDENED: "Hardened",
  CLASSIFIED: "Classified",
} as const;
