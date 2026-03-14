import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a "YYYY-MM-DD" string to a Date at noon UTC (no timezone can shift it to another day). */
export function toNoonUTC(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

/** Format a Date (or ISO string) in America/New_York so displayed dates match ET. */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    timeZone: "America/New_York",
    ...options,
  });
}

export function daysLeft(date: Date | string | null | undefined): string {
  if (!date) return "";
  const target = new Date(date);
  const now = new Date();

  // target uses UTC (noon-UTC stored dates); now uses local (browser = ET)
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

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
  NOT_STARTED: 0,
  LEARNING: 1,
  PROFICIENT: 2,
  MASTERED: 3,
} as const;

export const MASTERY_COLORS = {
  NOT_STARTED: "#ef4444",
  LEARNING: "#f59e0b",
  PROFICIENT: "#10b981",
  MASTERED: "#8b5cf6",
} as const;

export const MASTERY_LABELS = {
  NOT_STARTED: "Not Started",
  LEARNING: "Learning",
  PROFICIENT: "Proficient",
  MASTERED: "Mastered",
} as const;
