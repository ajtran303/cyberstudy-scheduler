import { describe, it, expect } from "vitest";
import {
  localDatePartsInTz,
  weekBoundsInTz,
  dayBoundsInTz,
  offsetMsInTz,
  APP_TIMEZONE,
} from "@/lib/tz";

const TZ = "America/New_York";

// Fixed reference dates
const WINTER_DATE = new Date("2025-01-15T10:00:00Z"); // Wed, EST (UTC-5)
const SUMMER_DATE = new Date("2025-06-15T10:00:00Z"); // Sun, EDT (UTC-4)

describe("APP_TIMEZONE", () => {
  it("should be America/New_York", () => {
    expect(APP_TIMEZONE).toBe("America/New_York");
  });
});

// ---------------------------------------------------------------------------
// localDatePartsInTz
// ---------------------------------------------------------------------------
describe("localDatePartsInTz", () => {
  it("returns correct parts for a known UTC winter date", () => {
    // 2025-01-15T10:00Z → 05:00 ET → still Jan 15
    const parts = localDatePartsInTz(WINTER_DATE, TZ);
    expect(parts).toEqual({ year: 2025, month: 0, day: 15 });
  });

  it("returns correct parts for a known UTC summer date", () => {
    // 2025-06-15T10:00Z → 06:00 ET → still Jun 15
    const parts = localDatePartsInTz(SUMMER_DATE, TZ);
    expect(parts).toEqual({ year: 2025, month: 5, day: 15 });
  });

  it("month is 0-based (January = 0, December = 11)", () => {
    const jan = localDatePartsInTz(new Date("2025-01-01T12:00:00Z"), TZ);
    expect(jan.month).toBe(0);

    const dec = localDatePartsInTz(new Date("2025-12-15T12:00:00Z"), TZ);
    expect(dec.month).toBe(11);
  });

  it("handles near-midnight UTC where ET date differs (rolls back)", () => {
    // 2025-01-16T03:00Z → Jan 15 at 22:00 ET (still previous day)
    const parts = localDatePartsInTz(new Date("2025-01-16T03:00:00Z"), TZ);
    expect(parts).toEqual({ year: 2025, month: 0, day: 15 });
  });

  it("handles near-midnight UTC where ET date differs (EDT)", () => {
    // 2025-06-16T03:00Z → Jun 15 at 23:00 ET (still previous day)
    const parts = localDatePartsInTz(new Date("2025-06-16T03:00:00Z"), TZ);
    expect(parts).toEqual({ year: 2025, month: 5, day: 15 });
  });

  it("handles year boundary: Jan 1 UTC early morning is still Dec 31 ET", () => {
    // 2025-01-01T04:00Z → Dec 31, 2024 at 23:00 EST
    const parts = localDatePartsInTz(new Date("2025-01-01T04:00:00Z"), TZ);
    expect(parts).toEqual({ year: 2024, month: 11, day: 31 });
  });

  it("handles date that does NOT roll back", () => {
    // 2025-01-15T18:00Z → Jan 15 at 13:00 ET (same day)
    const parts = localDatePartsInTz(new Date("2025-01-15T18:00:00Z"), TZ);
    expect(parts).toEqual({ year: 2025, month: 0, day: 15 });
  });
});

// ---------------------------------------------------------------------------
// weekBoundsInTz
// ---------------------------------------------------------------------------
describe("weekBoundsInTz", () => {
  it("returns correct Sunday start for a mid-week date", () => {
    // 2025-01-15 is a Wednesday → week starts Sun Jan 12
    const { weekStartISO, weekEndISO } = weekBoundsInTz(WINTER_DATE, TZ);
    expect(weekStartISO).toBe("2025-01-12");
    expect(weekEndISO).toBe("2025-01-18");
  });

  it("returns correct bounds when input is a Sunday", () => {
    // 2025-06-15 is a Sunday
    const { weekStartISO, weekEndISO } = weekBoundsInTz(SUMMER_DATE, TZ);
    expect(weekStartISO).toBe("2025-06-15");
    expect(weekEndISO).toBe("2025-06-21");
  });

  it("returns correct bounds when input is a Saturday", () => {
    // 2025-01-18 is a Saturday
    const sat = new Date("2025-01-18T12:00:00Z");
    const { weekStartISO, weekEndISO } = weekBoundsInTz(sat, TZ);
    expect(weekStartISO).toBe("2025-01-12");
    expect(weekEndISO).toBe("2025-01-18");
  });

  it("weekStartISO and weekEndISO are in YYYY-MM-DD format", () => {
    const { weekStartISO, weekEndISO } = weekBoundsInTz(WINTER_DATE, TZ);
    expect(weekStartISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weekEndISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("weekStart is Sunday midnight ET and weekEnd is Saturday 23:59:59.999 ET", () => {
    const { weekStart, weekEnd } = weekBoundsInTz(WINTER_DATE, TZ);

    // weekEnd should be exactly 7 days - 1ms after weekStart
    expect(weekEnd.getTime() - weekStart.getTime()).toBe(7 * 86_400_000 - 1);
  });

  it("weekStart represents midnight Sunday in ET", () => {
    // 2025-01-15 (Wed EST) → week starts Sun Jan 12 00:00 EST = Jan 12 05:00 UTC
    const { weekStart } = weekBoundsInTz(WINTER_DATE, TZ);
    expect(weekStart.toISOString()).toBe("2025-01-12T05:00:00.000Z");
  });

  it("weekStart accounts for EDT offset in summer", () => {
    // 2025-06-15 (Sun EDT) → week starts Sun Jun 15 00:00 EDT = Jun 15 04:00 UTC
    const { weekStart } = weekBoundsInTz(SUMMER_DATE, TZ);
    expect(weekStart.toISOString()).toBe("2025-06-15T04:00:00.000Z");
  });

  it("handles week spanning a month boundary", () => {
    // 2025-02-01 is a Saturday → week is Sun Jan 26 – Sat Feb 1
    const feb1 = new Date("2025-02-01T12:00:00Z");
    const { weekStartISO, weekEndISO } = weekBoundsInTz(feb1, TZ);
    expect(weekStartISO).toBe("2025-01-26");
    expect(weekEndISO).toBe("2025-02-01");
  });
});

// ---------------------------------------------------------------------------
// dayBoundsInTz
// ---------------------------------------------------------------------------
describe("dayBoundsInTz", () => {
  it("todayEnd is todayStart + 1 day - 1ms", () => {
    const { todayStart, todayEnd } = dayBoundsInTz(WINTER_DATE, TZ);
    expect(todayEnd.getTime() - todayStart.getTime()).toBe(86_400_000 - 1);
  });

  it("sevenDaysOut is 8 days from midnight (todayStart + 8d - 1ms)", () => {
    const { todayStart, sevenDaysOut } = dayBoundsInTz(WINTER_DATE, TZ);
    expect(sevenDaysOut.getTime() - todayStart.getTime()).toBe(
      8 * 86_400_000 - 1
    );
  });

  it("fourteenDaysOut is 15 days from midnight (todayStart + 15d - 1ms)", () => {
    const { todayStart, fourteenDaysOut } = dayBoundsInTz(WINTER_DATE, TZ);
    expect(fourteenDaysOut.getTime() - todayStart.getTime()).toBe(
      15 * 86_400_000 - 1
    );
  });

  it("todayStart is midnight ET for a winter date", () => {
    // 2025-01-15 midnight EST = 2025-01-15T05:00:00Z
    const { todayStart } = dayBoundsInTz(WINTER_DATE, TZ);
    expect(todayStart.toISOString()).toBe("2025-01-15T05:00:00.000Z");
  });

  it("todayStart is midnight ET for a summer date", () => {
    // 2025-06-15 midnight EDT = 2025-06-15T04:00:00Z
    const { todayStart } = dayBoundsInTz(SUMMER_DATE, TZ);
    expect(todayStart.toISOString()).toBe("2025-06-15T04:00:00.000Z");
  });

  it("todayEnd is 23:59:59.999 ET", () => {
    const { todayEnd } = dayBoundsInTz(WINTER_DATE, TZ);
    // 2025-01-15 23:59:59.999 EST = 2025-01-16T04:59:59.999Z
    expect(todayEnd.toISOString()).toBe("2025-01-16T04:59:59.999Z");
  });

  it("handles near-midnight UTC where local date rolls back", () => {
    // 2025-01-16T03:00Z → Jan 15 22:00 EST
    const { todayStart } = dayBoundsInTz(new Date("2025-01-16T03:00:00Z"), TZ);
    // todayStart should be Jan 15 midnight EST = Jan 15 05:00 UTC
    expect(todayStart.toISOString()).toBe("2025-01-15T05:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// offsetMsInTz
// ---------------------------------------------------------------------------
describe("offsetMsInTz", () => {
  it("returns approximately -5h for EST (winter)", () => {
    const offset = offsetMsInTz(WINTER_DATE, TZ);
    expect(offset).toBe(-5 * 3_600_000); // -18000000 ms
  });

  it("returns approximately -4h for EDT (summer)", () => {
    const offset = offsetMsInTz(SUMMER_DATE, TZ);
    expect(offset).toBe(-4 * 3_600_000); // -14400000 ms
  });

  it("returns 0 for UTC timezone", () => {
    const offset = offsetMsInTz(WINTER_DATE, "UTC");
    expect(offset).toBe(0);
  });

  it("returns positive offset for timezones ahead of UTC", () => {
    // Asia/Tokyo is UTC+9 year-round
    const offset = offsetMsInTz(WINTER_DATE, "Asia/Tokyo");
    expect(offset).toBe(9 * 3_600_000);
  });

  it("returns correct offset across DST boundary (spring forward)", () => {
    // 2025-03-09 is spring-forward day in US. Before 2am EST → after 3am EDT.
    const beforeDst = new Date("2025-03-09T06:00:00Z"); // 1:00 AM EST
    const afterDst = new Date("2025-03-09T08:00:00Z"); // 4:00 AM EDT

    expect(offsetMsInTz(beforeDst, TZ)).toBe(-5 * 3_600_000);
    expect(offsetMsInTz(afterDst, TZ)).toBe(-4 * 3_600_000);
  });

  it("returns correct offset across DST boundary (fall back)", () => {
    // 2025-11-02 is fall-back day in US. Before 2am EDT → after 1am EST.
    const beforeFallBack = new Date("2025-11-02T05:00:00Z"); // 1:00 AM EDT
    const afterFallBack = new Date("2025-11-02T07:00:00Z"); // 2:00 AM EST

    expect(offsetMsInTz(beforeFallBack, TZ)).toBe(-4 * 3_600_000);
    expect(offsetMsInTz(afterFallBack, TZ)).toBe(-5 * 3_600_000);
  });
});
