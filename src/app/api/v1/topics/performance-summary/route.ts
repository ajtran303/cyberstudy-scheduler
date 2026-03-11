import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { Mastery } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const topics = await prisma.topic.findMany({
    where: {
      course: { userId: user.id },
      mastery: { in: [Mastery.NOT_STARTED, Mastery.LEARNING, Mastery.PROFICIENT] },
    },
    select: {
      id: true,
      name: true,
      mastery: true,
      courseId: true,
      course: { select: { name: true, courseCode: true } },
      quizAttempts: {
        select: { correct: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      teachItBacks: {
        select: { outcome: true },
        where: { attemptedAt: { gte: thirtyDaysAgo } },
        orderBy: { attemptedAt: "desc" },
      },
    },
    orderBy: [{ course: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  const summary = topics.map((t) => {
    const quizTotal = t.quizAttempts.length;
    const quizMisses = t.quizAttempts.filter((q) => !q.correct).length;

    const tibEntries = t.teachItBacks;
    const lastTibOutcome = tibEntries[0]?.outcome ?? null;

    return {
      topicId: t.id,
      topicName: t.name,
      mastery: t.mastery,
      courseId: t.courseId,
      courseName: t.course.name,
      courseCode: t.course.courseCode,
      quiz: {
        recentAttempts: quizTotal,
        recentMissRate: quizTotal > 0 ? Math.round((quizMisses / quizTotal) * 100) / 100 : null,
      },
      tib: {
        last30dCount: tibEntries.length,
        lastOutcome: lastTibOutcome,
      },
    };
  });

  return successResponse(summary);
}
