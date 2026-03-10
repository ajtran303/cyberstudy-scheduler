export const APP_TIMEZONE = "America/New_York";

/** Get the UTC offset in milliseconds for a given instant in a timezone. */
export function offsetMsInTz(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  const localDate = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );
  return localDate.getTime() - now.getTime();
}

/** Get { year, month (0-based), day } in the given timezone. */
export function localDatePartsInTz(
  now: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const dateStr = now.toLocaleDateString("en-CA", { timeZone }); // "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Compute Sun–Sat week boundaries anchored to a timezone, returned as UTC Dates. */
export function weekBoundsInTz(
  now: Date,
  timeZone: string
): { weekStart: Date; weekEnd: Date; weekStartISO: string; weekEndISO: string } {
  const offset = offsetMsInTz(now, timeZone);
  const { year, month, day } = localDatePartsInTz(now, timeZone);

  // JS Date.getDay(): 0=Sunday. Build a local Date to find day-of-week.
  const localDay = new Date(year, month, day).getDay(); // 0-6

  // Sunday midnight in the timezone, expressed as UTC
  const sundayMidnightUtc = new Date(
    Date.UTC(year, month, day - localDay, 0, 0, 0) - offset
  );
  // Saturday 23:59:59.999 in the timezone, expressed as UTC
  const saturdayEndUtc = new Date(
    sundayMidnightUtc.getTime() + 7 * 86_400_000 - 1
  );

  // ISO date strings for the week boundaries (YYYY-MM-DD)
  const ws = new Date(sundayMidnightUtc.getTime() + offset);
  const we = new Date(saturdayEndUtc.getTime() + offset);
  const weekStartISO = `${ws.getUTCFullYear()}-${String(ws.getUTCMonth() + 1).padStart(2, "0")}-${String(ws.getUTCDate()).padStart(2, "0")}`;
  const weekEndISO = `${we.getUTCFullYear()}-${String(we.getUTCMonth() + 1).padStart(2, "0")}-${String(we.getUTCDate()).padStart(2, "0")}`;

  return { weekStart: sundayMidnightUtc, weekEnd: saturdayEndUtc, weekStartISO, weekEndISO };
}

/** Compute day boundaries anchored to a timezone, returned as UTC Dates. */
export function dayBoundsInTz(
  now: Date,
  timeZone: string
): { todayStart: Date; todayEnd: Date; sevenDaysOut: Date; fourteenDaysOut: Date } {
  const offset = offsetMsInTz(now, timeZone);
  const { year, month, day } = localDatePartsInTz(now, timeZone);

  // Midnight in the timezone, expressed as UTC
  const midnightUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - offset);
  const todayStart = midnightUtc;
  const todayEnd = new Date(midnightUtc.getTime() + 86_400_000 - 1);
  const sevenDaysOut = new Date(midnightUtc.getTime() + 8 * 86_400_000 - 1);
  const fourteenDaysOut = new Date(midnightUtc.getTime() + 15 * 86_400_000 - 1);

  return { todayStart, todayEnd, sevenDaysOut, fourteenDaysOut };
}
