/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings: 0-5 (0=complete failure, 5=perfect recall)
 * - quality < 3: reset interval, decrease ease
 * - quality >= 3: progress interval, adjust ease
 */

import { APP_TIMEZONE, localDatePartsInTz } from "@/lib/tz";

export interface SrsInput {
  quality: number; // 0-5
  currentInterval: number; // days (0 = first review)
  currentEaseFactor: number; // >= 1.3
}

export interface SrsResult {
  nextInterval: number;
  nextEaseFactor: number;
  nextReviewAt: Date;
}

export function computeSrs({
  quality,
  currentInterval,
  currentEaseFactor,
}: SrsInput): SrsResult {
  let nextInterval: number;
  let nextEaseFactor: number;

  // Ease factor adjustment: ef + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const diff = 5 - quality;
  nextEaseFactor = currentEaseFactor + (0.1 - diff * (0.08 + diff * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  if (quality < 3) {
    // Failed recall — reset to 1 day
    nextInterval = 1;
  } else {
    if (currentInterval === 0) {
      nextInterval = 1;
    } else if (currentInterval === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }
  }

  // nextReviewAt = noon UTC on local-date + interval days (ET-aware)
  const now = new Date();
  const { year, month, day } = localDatePartsInTz(now, APP_TIMEZONE);
  const nextReviewAt = new Date(
    Date.UTC(year, month, day + nextInterval, 12),
  );

  return { nextInterval, nextEaseFactor, nextReviewAt };
}

