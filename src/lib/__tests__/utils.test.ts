import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toNoonUTC,
  daysLeft,
  addDaysLeft,
  MASTERY_ORDER,
  MASTERY_COLORS,
  MASTERY_LABELS,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// toNoonUTC
// ---------------------------------------------------------------------------
describe("toNoonUTC", () => {
  it("returns a Date object", () => {
    const result = toNoonUTC("2025-06-15");
    expect(result).toBeInstanceOf(Date);
  });

  it("sets the correct year, month, and day in UTC", () => {
    const result = toNoonUTC("2025-06-15");
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(5); // June is 5 (0-indexed)
    expect(result.getUTCDate()).toBe(15);
  });

  it("sets hours to 12, minutes to 0, seconds to 0 in UTC", () => {
    const result = toNoonUTC("2025-06-15");
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("handles January 1st correctly", () => {
    const result = toNoonUTC("2025-01-01");
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(12);
  });

  it("handles December 31st correctly", () => {
    const result = toNoonUTC("2025-12-31");
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCHours()).toBe(12);
  });

  it("handles leap day correctly", () => {
    const result = toNoonUTC("2024-02-29");
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(29);
    expect(result.getUTCHours()).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// daysLeft
// ---------------------------------------------------------------------------
describe("daysLeft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "" for null', () => {
    expect(daysLeft(null)).toBe("");
  });

  it('returns "" for undefined', () => {
    expect(daysLeft(undefined)).toBe("");
  });

  it('returns "late" for a date in the past', () => {
    expect(daysLeft(new Date("2025-06-14T12:00:00Z"))).toBe("late");
  });

  it('returns "late" for a date several days in the past', () => {
    expect(daysLeft(new Date("2025-06-10T12:00:00Z"))).toBe("late");
  });

  it('returns "due" for today\'s date', () => {
    expect(daysLeft(new Date("2025-06-15T12:00:00Z"))).toBe("due");
  });

  it('returns "tomorrow" for the next day', () => {
    expect(daysLeft(new Date("2025-06-16T12:00:00Z"))).toBe("tomorrow");
  });

  it('returns "5 days" for a date 5 days in the future', () => {
    expect(daysLeft(new Date("2025-06-20T12:00:00Z"))).toBe("5 days");
  });

  it('returns "2 days" for a date 2 days in the future', () => {
    expect(daysLeft(new Date("2025-06-17T12:00:00Z"))).toBe("2 days");
  });

  it("accepts an ISO string instead of a Date", () => {
    expect(daysLeft("2025-06-15T12:00:00Z")).toBe("due");
    expect(daysLeft("2025-06-20T12:00:00Z")).toBe("5 days");
  });

  it("handles dates far in the future", () => {
    expect(daysLeft(new Date("2025-07-15T12:00:00Z"))).toBe("30 days");
  });
});

// ---------------------------------------------------------------------------
// addDaysLeft
// ---------------------------------------------------------------------------
describe("addDaysLeft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds daysLeft based on dueDate field", () => {
    const item = { id: 1, name: "topic", dueDate: new Date("2025-06-20T12:00:00Z") };
    const result = addDaysLeft(item);
    expect(result.daysLeft).toBe("5 days");
  });

  it("adds daysLeft based on date field when dueDate is absent", () => {
    const item = { id: 2, name: "event", date: new Date("2025-06-16T12:00:00Z") };
    const result = addDaysLeft(item);
    expect(result.daysLeft).toBe("tomorrow");
  });

  it("prefers dueDate over date when both are present", () => {
    const item = {
      dueDate: new Date("2025-06-20T12:00:00Z"),
      date: new Date("2025-06-16T12:00:00Z"),
    };
    const result = addDaysLeft(item);
    expect(result.daysLeft).toBe("5 days");
  });

  it("preserves all original properties", () => {
    const item = { id: 42, name: "test", extra: true, dueDate: new Date("2025-06-15T12:00:00Z") };
    const result = addDaysLeft(item);
    expect(result.id).toBe(42);
    expect(result.name).toBe("test");
    expect(result.extra).toBe(true);
    expect(result.daysLeft).toBe("due");
  });

  it('returns daysLeft "" when dueDate is null', () => {
    const item = { dueDate: null };
    const result = addDaysLeft(item);
    expect(result.daysLeft).toBe("");
  });

  it('returns daysLeft "" when date is null and dueDate is absent', () => {
    const item = { date: null };
    const result = addDaysLeft(item);
    expect(result.daysLeft).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Mastery constants
// ---------------------------------------------------------------------------
describe("MASTERY_ORDER", () => {
  it("maps NOT_STARTED to 0", () => {
    expect(MASTERY_ORDER.NOT_STARTED).toBe(0);
  });

  it("maps LEARNING to 1", () => {
    expect(MASTERY_ORDER.LEARNING).toBe(1);
  });

  it("maps PROFICIENT to 2", () => {
    expect(MASTERY_ORDER.PROFICIENT).toBe(2);
  });

  it("maps MASTERED to 3", () => {
    expect(MASTERY_ORDER.MASTERED).toBe(3);
  });

  it("has exactly 4 keys", () => {
    expect(Object.keys(MASTERY_ORDER)).toHaveLength(4);
  });
});

describe("MASTERY_COLORS", () => {
  it("has a hex color for NOT_STARTED", () => {
    expect(MASTERY_COLORS.NOT_STARTED).toBe("#ef4444");
  });

  it("has a hex color for LEARNING", () => {
    expect(MASTERY_COLORS.LEARNING).toBe("#f59e0b");
  });

  it("has a hex color for PROFICIENT", () => {
    expect(MASTERY_COLORS.PROFICIENT).toBe("#10b981");
  });

  it("has a hex color for MASTERED", () => {
    expect(MASTERY_COLORS.MASTERED).toBe("#8b5cf6");
  });

  it("all values are valid hex color strings", () => {
    Object.values(MASTERY_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe("MASTERY_LABELS", () => {
  it('maps NOT_STARTED to "Not Started"', () => {
    expect(MASTERY_LABELS.NOT_STARTED).toBe("Not Started");
  });

  it('maps LEARNING to "Learning"', () => {
    expect(MASTERY_LABELS.LEARNING).toBe("Learning");
  });

  it('maps PROFICIENT to "Proficient"', () => {
    expect(MASTERY_LABELS.PROFICIENT).toBe("Proficient");
  });

  it('maps MASTERED to "Mastered"', () => {
    expect(MASTERY_LABELS.MASTERED).toBe("Mastered");
  });

  it("has exactly 4 keys", () => {
    expect(Object.keys(MASTERY_LABELS)).toHaveLength(4);
  });
});
