import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { addDaysLeft } from "@/lib/utils";
import { APP_TIMEZONE, localDatePartsInTz } from "@/lib/tz";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "week";
  const dateStr = url.searchParams.get("date");

  let baseY: number, baseM: number, baseD: number;
  if (dateStr) {
    // Explicit date param — parse at noon UTC (represents a calendar date)
    const baseDate = new Date(dateStr + "T12:00:00Z");
    baseY = baseDate.getUTCFullYear();
    baseM = baseDate.getUTCMonth();
    baseD = baseDate.getUTCDate();
  } else {
    // No date param — use today in America/New_York
    const parts = localDatePartsInTz(new Date(), APP_TIMEZONE);
    baseY = parts.year;
    baseM = parts.month;
    baseD = parts.day;
  }

  let start: Date;
  let end: Date;

  if (view === "month") {
    start = new Date(Date.UTC(baseY, baseM, 1, 0, 0, 0));
    end = new Date(Date.UTC(baseY, baseM + 1, 0, 23, 59, 59));
  } else {
    // Week view: start on Monday (UTC day-of-week)
    const dayOfWeek = new Date(Date.UTC(baseY, baseM, baseD)).getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start = new Date(Date.UTC(baseY, baseM, baseD + diff, 0, 0, 0));
    end = new Date(Date.UTC(baseY, baseM, baseD + diff + 6, 23, 59, 59));
  }

  const [topics, assignments, exams] = await Promise.all([
    prisma.topic.findMany({
      where: {
        course: { userId: user.id },
        date: { gte: start, lte: end },
      },
      include: { course: { select: { id: true, name: true, color: true } } },
    }),
    prisma.assignment.findMany({
      where: {
        course: { userId: user.id },
        dueDate: { gte: start, lte: end },
      },
      include: { course: { select: { id: true, name: true, color: true } } },
    }),
    prisma.exam.findMany({
      where: {
        course: { userId: user.id },
        date: { gte: start, lte: end },
      },
      include: { course: { select: { id: true, name: true, color: true } } },
    }),
  ]);

  const events = [
    ...topics.map((t) => ({
      id: t.id,
      type: "topic" as const,
      name: t.name,
      date: t.date,
      course: t.course,
      mastery: t.mastery,
    })),
    ...assignments.map((a) => ({
      id: a.id,
      type: "assignment" as const,
      name: a.name,
      date: a.dueDate,
      course: a.course,
      status: a.status,
      daysLeft: addDaysLeft(a).daysLeft,
    })),
    ...exams.map((e) => ({
      id: e.id,
      type: "exam" as const,
      name: e.name,
      date: e.date,
      course: e.course,
      status: e.status,
      daysLeft: addDaysLeft(e).daysLeft,
    })),
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return successResponse({
    view,
    start: start.toISOString(),
    end: end.toISOString(),
    events,
  });
}
