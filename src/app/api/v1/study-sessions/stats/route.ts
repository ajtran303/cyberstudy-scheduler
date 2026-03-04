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

    if (s.course) {
      const existing = courseMap.get(s.course.id);
      if (existing) {
        existing.totalMinutes += mins;
        existing.sessionCount += 1;
      } else {
        courseMap.set(s.course.id, {
          name: s.course.name,
          color: s.course.color,
          totalMinutes: mins,
          sessionCount: 1,
        });
      }
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

    if (s.course) {
      day[s.course.id] = (day[s.course.id] || 0) + mins;
    }
  }

  // Fill in missing days so the chart has continuous x-axis
  const byDay: Array<Record<string, string | number>> = [];
  const cursor = new Date(since);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (cursor <= today) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const entry = dayMap.get(dateKey) || { total: 0 };
    byDay.push({ date: dateKey, ...entry });
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
