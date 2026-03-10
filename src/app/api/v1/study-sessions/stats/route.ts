import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const days = Math.min(Number(url.searchParams.get("days")) || 30, 365);

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const where = {
    userId: user.id,
    durationMinutes: { not: null },
    startedAt: { gte: since },
    ...(courseId ? { courseId } : {}),
  };

  const sessions = await prisma.studySession.findMany({
    where,
    include: { course: { select: { id: true, name: true, color: true } } },
    orderBy: { startedAt: "asc" },
  });

  // Aggregate totals
  let totalMinutes = 0;
  const courseMap = new Map<string, { name: string; color: string; totalMinutes: number; sessionCount: number }>();

  for (const s of sessions) {
    const mins = s.durationMinutes!;
    totalMinutes += mins;

    const key = s.course ? s.course.id : "__general__";
    const existing = courseMap.get(key);
    if (existing) {
      existing.totalMinutes += mins;
      existing.sessionCount += 1;
    } else {
      courseMap.set(key, {
        name: s.course ? s.course.name : "General",
        color: s.course ? s.course.color : "#6b7280",
        totalMinutes: mins,
        sessionCount: 1,
      });
    }
  }

  const sessionCount = sessions.length;
  const averageMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

  const byCourse = Array.from(courseMap.entries()).map(([id, data]) => ({
    courseId: id,
    ...data,
  }));

  // Build byDay array with per-course breakdowns for stacked chart
  const dayMap = new Map<string, Record<string, number>>();

  for (const s of sessions) {
    const dateKey = s.startedAt.toISOString().slice(0, 10);
    const mins = s.durationMinutes!;

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { total: 0 });
    }
    const day = dayMap.get(dateKey)!;
    day.total += mins;

    const courseKey = s.course ? s.course.id : "__general__";
    day[courseKey] = (day[courseKey] || 0) + mins;
  }

  // Fill in missing days so the chart has continuous x-axis
  // Ensure every day has a 0 for each course so stacked areas render
  const allCourseIds = Array.from(courseMap.keys());
  const zeroFill: Record<string, number> = {};
  for (const id of allCourseIds) zeroFill[id] = 0;

  const byDay: Array<Record<string, string | number>> = [];
  const cursor = new Date(since);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (cursor <= today) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const entry = dayMap.get(dateKey) || {};
    byDay.push({ date: dateKey, ...zeroFill, total: 0, ...entry });
    cursor.setDate(cursor.getDate() + 1);
  }

  return successResponse({
    totalMinutes,
    sessionCount,
    averageMinutes,
    byCourse,
    byDay,
  });
}
