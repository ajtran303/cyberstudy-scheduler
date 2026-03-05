import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a "YYYY-MM-DD" string to a Date at noon UTC (no timezone can shift it to another day). */
export function toNoonUTC(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

/** Format a Date (or ISO string) using UTC components so the displayed date is timezone-safe. */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // Build a date from UTC components in local time for locale formatting
  const local = new Date(y, m, day);
  return local.toLocaleDateString(undefined, options);
}

export function daysLeft(date: Date | string | null | undefined): string {
  if (!date) return "";
  const target = new Date(date);
  const now = new Date();

  // Use UTC components so noon-UTC dates are never shifted
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const diffDays = Math.round((targetDay - nowDay) / (1000 * 60 * 60 * 24));

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
