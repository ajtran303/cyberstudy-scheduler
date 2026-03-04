/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings: 0-5 (0=complete failure, 5=perfect recall)
 * - quality < 3: reset interval, decrease ease
 * - quality >= 3: progress interval, adjust ease
 */

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

  // nextReviewAt = start of day + interval days
  const now = new Date();
  const nextReviewAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + nextInterval,
  );

  return { nextInterval, nextEaseFactor, nextReviewAt };
}

/** Map TeachItBack outcome to SM-2 quality (0-5) */
export function teachItBackQuality(outcome: string): number {
  switch (outcome) {
    case "PASS":
      return 5;
    case "PARTIAL":
      return 3;
    case "MISS":
      return 1;
    default:
      return 1;
  }
}

/** Map QuizAttempt correctness to SM-2 quality (0-5) */
export function quizAttemptQuality(correct: boolean): number {
  return correct ? 4 : 1;
}
