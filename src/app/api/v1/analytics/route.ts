import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");

  const where: Prisma.TopicWhereInput = {
    course: { userId: user.id },
  };
  if (courseId) where.courseId = courseId;

  const topics = await prisma.topic.findMany({
    where,
    select: { mastery: true },
  });

  const total = topics.length;
  const distribution = {
    NOT_STARTED: 0,
    LEARNING: 0,
    PROFICIENT: 0,
    MASTERED: 0,
  };

  for (const t of topics) {
    distribution[t.mastery]++;
  }

  const percentages = {
    NOT_STARTED: total ? Math.round((distribution.NOT_STARTED / total) * 100) : 0,
    LEARNING: total ? Math.round((distribution.LEARNING / total) * 100) : 0,
    PROFICIENT: total ? Math.round((distribution.PROFICIENT / total) * 100) : 0,
    MASTERED: total ? Math.round((distribution.MASTERED / total) * 100) : 0,
  };

  return successResponse({ total, distribution, percentages });
}
