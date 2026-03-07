import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { APP_TIMEZONE, dayBoundsInTz } from "@/lib/tz";
import { interleaveTopics } from "@/lib/interleave";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const { todayStart, todayEnd, sevenDaysOut, fourteenDaysOut } =
    dayBoundsInTz(now, APP_TIMEZONE);

  // Phase 1: parallel queries
  const [srsTopics, pendingAssignments, upcomingExams, todaySessions, todayTeachItBacks, todayQuizAttempts] =
    await Promise.all([
      // SRS reviews due
      prisma.topic.findMany({
        where: {
          course: { userId: user.id },
          mastery: { in: ["SCANNING", "HARDENED"] },
          OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
        },
        include: {
          course: { select: { id: true, name: true, color: true } },
        },
        orderBy: { nextReviewAt: "asc" },
      }),

      // Assignments due within 7 days
      prisma.assignment.findMany({
        where: {
          course: { userId: user.id },
          status: "PENDING",
          dueDate: { lte: sevenDaysOut },
        },
        include: {
          course: { select: { id: true, name: true, color: true } },
        },
        orderBy: { dueDate: "asc" },
      }),

      // Exams within 14 days
      prisma.exam.findMany({
        where: {
          course: { userId: user.id },
          status: "UPCOMING",
          date: { lte: fourteenDaysOut },
        },
        include: {
          course: { select: { id: true, name: true, color: true } },
        },
        orderBy: { date: "asc" },
      }),

      // Study sessions today
      prisma.studySession.findMany({
        where: {
          userId: user.id,
          startedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // TeachItBack records today
      prisma.teachItBack.count({
        where: {
          topic: { course: { userId: user.id } },
          attemptedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // QuizAttempt records today
      prisma.quizAttempt.count({
        where: {
          topic: { course: { userId: user.id } },
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

  // Phase 2: per-exam topic queries (depends on upcomingExams)
  const examPrep = await Promise.all(
    upcomingExams.map(async (exam) => {
      const topics = exam.date
        ? await prisma.topic.findMany({
            where: {
              courseId: exam.courseId,
              date: { lte: exam.date },
              mastery: { not: "CLASSIFIED" },
            },
            select: {
              id: true,
              name: true,
              mastery: true,
              nextReviewAt: true,
            },
            orderBy: { mastery: "asc" },
          })
        : [];

      const topicsNeedingReview = topics.filter(
        (t) =>
          t.mastery === "EXPOSED" ||
          ((t.mastery === "SCANNING" || t.mastery === "HARDENED") &&
            (!t.nextReviewAt || new Date(t.nextReviewAt) <= now))
      ).length;

      return {
        exam: {
          id: exam.id,
          name: exam.name,
          date: exam.date,
          course: exam.course,
        },
        topics,
        topicsNeedingReview,
      };
    })
  );

  // Group SRS topics by course
  const srsByCourse: Record<
    string,
    {
      course: { id: string; name: string; color: string };
      topics: typeof srsTopics;
    }
  > = {};
  for (const topic of srsTopics) {
    if (!srsByCourse[topic.courseId]) {
      srsByCourse[topic.courseId] = { course: topic.course, topics: [] };
    }
    srsByCourse[topic.courseId].topics.push(topic);
  }

  // Daily stats
  const studyMinutesToday = todaySessions.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0
  );

  // Weekly average: sessions from last 7 days
  const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);
  const weekSessions = await prisma.studySession.findMany({
    where: {
      userId: user.id,
      startedAt: { gte: weekStart, lte: todayEnd },
    },
  });
  const weekTotalMinutes = weekSessions.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0
  );
  const weeklyAvgMinutes = Math.round(weekTotalMinutes / 7);

  // Deadlines: merge assignments and exams, sorted by date
  const deadlines = [
    ...pendingAssignments.map((a) => ({
      id: a.id,
      type: "assignment" as const,
      name: a.name,
      date: a.dueDate,
      status: a.status,
      course: a.course,
    })),
    ...upcomingExams.map((e) => ({
      id: e.id,
      type: "exam" as const,
      name: e.name,
      date: e.date,
      status: e.status,
      course: e.course,
    })),
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const interleavedReviews = interleaveTopics(srsTopics);

  return successResponse({
    stats: {
      studyMinutesToday,
      weeklyAvgMinutes,
      reviewsToday: todayTeachItBacks + todayQuizAttempts,
    },
    srsReviews: Object.values(srsByCourse),
    interleavedReviews,
    srsTotal: srsTopics.length,
    deadlines,
    examPrep: examPrep.filter((ep) => ep.topics.length > 0),
  });
}
