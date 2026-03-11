import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { APP_TIMEZONE, dayBoundsInTz, localDatePartsInTz } from "@/lib/tz";
import { MASTERY_ORDER } from "@/lib/utils";
import { Mastery } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const { year, month, day } = localDatePartsInTz(now, APP_TIMEZONE);
  const todayISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Parse query params
  const url = req.nextUrl;
  const deadlineWindowDays = Math.max(
    1,
    Math.min(90, Number(url.searchParams.get("deadlineWindowDays")) || 7)
  );
  const examWindowDays = Math.max(deadlineWindowDays, 14);
  const includeProficient = url.searchParams.get("include") === "proficient";

  const { todayStart } = dayBoundsInTz(now, APP_TIMEZONE);
  const assignmentHorizon = new Date(
    todayStart.getTime() + (deadlineWindowDays + 1) * 86_400_000 - 1
  );
  const examHorizon = new Date(
    todayStart.getTime() + (examWindowDays + 1) * 86_400_000 - 1
  );

  // Mastery filter: NOT_STARTED + LEARNING, optionally PROFICIENT
  const masteryFilter: Mastery[] = [Mastery.NOT_STARTED, Mastery.LEARNING];
  if (includeProficient) masteryFilter.push(Mastery.PROFICIENT);

  // Parallel queries
  const [topics, pendingAssignments, upcomingExams] = await Promise.all([
    prisma.topic.findMany({
      where: {
        course: { userId: user.id },
        mastery: { in: masteryFilter },
      },
      select: {
        id: true,
        name: true,
        mastery: true,
        courseId: true,
      },
      orderBy: { sortOrder: "asc" },
    }),

    prisma.assignment.findMany({
      where: {
        course: { userId: user.id },
        status: "PENDING",
        dueDate: { gte: now, lte: assignmentHorizon },
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
        courseId: true,
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.exam.findMany({
      where: {
        course: { userId: user.id },
        status: "UPCOMING",
        date: { gte: now, lte: examHorizon },
      },
      select: {
        id: true,
        name: true,
        date: true,
        courseId: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // Collect all course IDs referenced by topics or deadlines
  const courseIds = [
    ...new Set([
      ...topics.map((t) => t.courseId),
      ...pendingAssignments.map((a) => a.courseId),
      ...upcomingExams.map((e) => e.courseId),
    ]),
  ];

  // Fetch course details
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, name: true, courseCode: true },
  });

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  // Build per-course grouping
  const courseBuckets: Record<
    string,
    {
      id: string;
      code: string | null;
      name: string;
      topics: Array<{ topicId: string; topicName: string; mastery: string }>;
      deadlines: Array<{
        name: string;
        type: "assignment" | "exam";
        dueDate: string | null;
        daysLeft: number | null;
      }>;
    }
  > = {};

  function ensureBucket(courseId: string) {
    if (!courseBuckets[courseId]) {
      const course = courseMap.get(courseId);
      courseBuckets[courseId] = {
        id: courseId,
        code: course?.courseCode ?? null,
        name: course?.name ?? "Unknown",
        topics: [],
        deadlines: [],
      };
    }
    return courseBuckets[courseId];
  }

  // Add topics, sorted by mastery priority
  for (const topic of topics) {
    ensureBucket(topic.courseId).topics.push({
      topicId: topic.id,
      topicName: topic.name,
      mastery: topic.mastery,
    });
  }

  // Sort topics within each course: NOT_STARTED first, then LEARNING, then PROFICIENT
  for (const bucket of Object.values(courseBuckets)) {
    bucket.topics.sort(
      (a, b) =>
        (MASTERY_ORDER[a.mastery as keyof typeof MASTERY_ORDER] ?? 0) -
        (MASTERY_ORDER[b.mastery as keyof typeof MASTERY_ORDER] ?? 0)
    );
  }

  // Add assignment deadlines
  for (const a of pendingAssignments) {
    ensureBucket(a.courseId).deadlines.push({
      name: a.name,
      type: "assignment",
      dueDate: a.dueDate?.toISOString().slice(0, 10) ?? null,
      daysLeft: a.dueDate ? computeDaysLeft(a.dueDate, now) : null,
    });
  }

  // Add exam deadlines
  for (const e of upcomingExams) {
    ensureBucket(e.courseId).deadlines.push({
      name: e.name,
      type: "exam",
      dueDate: e.date?.toISOString().slice(0, 10) ?? null,
      daysLeft: e.date ? computeDaysLeft(e.date, now) : null,
    });
  }

  // Sort deadlines within each course by date
  for (const bucket of Object.values(courseBuckets)) {
    bucket.deadlines.sort((a, b) => {
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
  }

  // Sort courses: those with soonest deadlines first, then alphabetically
  const sortedCourses = Object.values(courseBuckets).sort((a, b) => {
    const aNearest = a.deadlines[0]?.daysLeft ?? Infinity;
    const bNearest = b.deadlines[0]?.daysLeft ?? Infinity;
    if (aNearest !== bNearest) return aNearest - bNearest;
    return a.name.localeCompare(b.name);
  });

  return successResponse({
    date: todayISO,
    courses: sortedCourses,
  });
}

function computeDaysLeft(target: Date, now: Date): number {
  const targetDay = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate()
  );
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDay - nowDay) / (1000 * 60 * 60 * 24));
}
