import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { APP_TIMEZONE, weekBoundsInTz } from "@/lib/tz";
import { MASTERY_ORDER } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const { weekStart, weekEnd, weekStartISO, weekEndISO } = weekBoundsInTz(
    now,
    APP_TIMEZONE
  );

  // Three parallel queries
  const [thisWeekTopics, notStartedTopics] = await Promise.all([
    // 1. Topics scheduled this week
    prisma.topic.findMany({
      where: {
        course: { userId: user.id },
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        course: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),

    // 2. Not-started backlog (outside this week or no date)
    prisma.topic.findMany({
      where: {
        course: { userId: user.id },
        mastery: "NOT_STARTED",
        OR: [
          { date: null },
          { date: { lt: weekStart } },
          { date: { gt: weekEnd } },
        ],
      },
      include: {
        course: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  // Gather course IDs that have this-week topics
  const courseIdsThisWeek = [
    ...new Set(thisWeekTopics.map((t) => t.courseId)),
  ];

  // 3. Nearest deadlines for those courses
  const [nearestAssignments, nearestExams] = await Promise.all([
    Promise.all(
      courseIdsThisWeek.map((courseId) =>
        prisma.assignment.findFirst({
          where: {
            courseId,
            status: "PENDING",
            dueDate: { gte: now },
          },
          select: { name: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        })
      )
    ),
    Promise.all(
      courseIdsThisWeek.map((courseId) =>
        prisma.exam.findFirst({
          where: {
            courseId,
            status: "UPCOMING",
            date: { gte: now },
          },
          select: { name: true, date: true },
          orderBy: { date: "asc" },
        })
      )
    ),
  ]);

  // Build nearest deadline map: courseId -> { name, date, type }
  const deadlineMap: Record<
    string,
    { name: string; date: string | null; type: "assignment" | "exam" } | null
  > = {};
  courseIdsThisWeek.forEach((courseId, i) => {
    const a = nearestAssignments[i];
    const e = nearestExams[i];
    // Pick whichever is sooner
    const aTime = a?.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const eTime = e?.date ? new Date(e.date).getTime() : Infinity;
    if (aTime === Infinity && eTime === Infinity) {
      deadlineMap[courseId] = null;
    } else if (aTime <= eTime) {
      deadlineMap[courseId] = {
        name: a!.name,
        date: a!.dueDate?.toISOString() ?? null,
        type: "assignment",
      };
    } else {
      deadlineMap[courseId] = {
        name: e!.name,
        date: e!.date?.toISOString() ?? null,
        type: "exam",
      };
    }
  });

  // Group this-week topics by course
  const thisWeekByCourse: Record<
    string,
    {
      course: { id: string; name: string; color: string };
      nearestDeadline: (typeof deadlineMap)[string];
      topics: Array<{
        id: string;
        name: string;
        mastery: string;
        date: string | null;
      }>;
    }
  > = {};

  for (const topic of thisWeekTopics) {
    if (!thisWeekByCourse[topic.courseId]) {
      thisWeekByCourse[topic.courseId] = {
        course: topic.course,
        nearestDeadline: deadlineMap[topic.courseId] ?? null,
        topics: [],
      };
    }
    thisWeekByCourse[topic.courseId].topics.push({
      id: topic.id,
      name: topic.name,
      mastery: topic.mastery,
      date: topic.date?.toISOString() ?? null,
    });
  }

  // Sort topics within each group: date asc, then mastery priority (NOT_STARTED first)
  for (const group of Object.values(thisWeekByCourse)) {
    group.topics.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity;
      const dateB = b.date ? new Date(b.date).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return (
        (MASTERY_ORDER[a.mastery as keyof typeof MASTERY_ORDER] ?? 0) -
        (MASTERY_ORDER[b.mastery as keyof typeof MASTERY_ORDER] ?? 0)
      );
    });
  }

  // Sort course groups: by nearest deadline (soonest first), then alphabetically
  const thisWeek = Object.values(thisWeekByCourse).sort((a, b) => {
    const aTime = a.nearestDeadline?.date
      ? new Date(a.nearestDeadline.date).getTime()
      : Infinity;
    const bTime = b.nearestDeadline?.date
      ? new Date(b.nearestDeadline.date).getTime()
      : Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return a.course.name.localeCompare(b.course.name);
  });

  // Group not-started topics by course, sorted alphabetically
  const notStartedByCourse: Record<
    string,
    {
      course: { id: string; name: string; color: string };
      topics: Array<{ id: string; name: string; date: string | null }>;
    }
  > = {};

  for (const topic of notStartedTopics) {
    if (!notStartedByCourse[topic.courseId]) {
      notStartedByCourse[topic.courseId] = {
        course: topic.course,
        topics: [],
      };
    }
    notStartedByCourse[topic.courseId].topics.push({
      id: topic.id,
      name: topic.name,
      date: topic.date?.toISOString() ?? null,
    });
  }

  // Sort not-started topics: date asc, nulls last
  for (const group of Object.values(notStartedByCourse)) {
    group.topics.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity;
      const dateB = b.date ? new Date(b.date).getTime() : Infinity;
      return dateA - dateB;
    });
  }

  const notStarted = Object.values(notStartedByCourse).sort((a, b) =>
    a.course.name.localeCompare(b.course.name)
  );

  // Stats
  const totalThisWeek = thisWeekTopics.length;
  const completedThisWeek = thisWeekTopics.filter(
    (t) => t.mastery === "MASTERED"
  ).length;
  const remainingThisWeek = totalThisWeek - completedThisWeek;

  return successResponse({
    weekStart: weekStartISO,
    weekEnd: weekEndISO,
    stats: { totalThisWeek, completedThisWeek, remainingThisWeek },
    thisWeek,
    notStarted,
  });
}
