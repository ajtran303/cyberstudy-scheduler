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
    EXPOSED: 0,
    SCANNING: 0,
    HARDENED: 0,
    CLASSIFIED: 0,
  };

  for (const t of topics) {
    distribution[t.mastery]++;
  }

  const percentages = {
    EXPOSED: total ? Math.round((distribution.EXPOSED / total) * 100) : 0,
    SCANNING: total ? Math.round((distribution.SCANNING / total) * 100) : 0,
    HARDENED: total ? Math.round((distribution.HARDENED / total) * 100) : 0,
    CLASSIFIED: total ? Math.round((distribution.CLASSIFIED / total) * 100) : 0,
  };

  return successResponse({ total, distribution, percentages });
}
