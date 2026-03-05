import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { MASTERY_ORDER } from "@/lib/utils";
import { Mastery, Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const courseIds = url.searchParams.get("courseIds");
  const sort = url.searchParams.get("sort") || "mastery_priority";

  const where: Prisma.TopicWhereInput = {
    course: { userId: user.id },
  };

  if (courseId) {
    where.courseId = courseId;
  } else if (courseIds) {
    where.courseId = { in: courseIds.split(",") };
  }

  let topics;

  if (sort === "mastery_priority") {
    // Fetch all and sort in JS by mastery order
    topics = await prisma.topic.findMany({
      where,
      include: { course: { select: { id: true, name: true, color: true } } },
    });

    topics.sort((a, b) => {
      const aMastery = MASTERY_ORDER[a.mastery as keyof typeof MASTERY_ORDER] ?? 99;
      const bMastery = MASTERY_ORDER[b.mastery as keyof typeof MASTERY_ORDER] ?? 99;
      if (aMastery !== bMastery) return aMastery - bMastery;
      // Secondary: lastReviewedAt asc, nulls first
      if (!a.lastReviewedAt && b.lastReviewedAt) return -1;
      if (a.lastReviewedAt && !b.lastReviewedAt) return 1;
      if (a.lastReviewedAt && b.lastReviewedAt) {
        return a.lastReviewedAt.getTime() - b.lastReviewedAt.getTime();
      }
      return 0;
    });
  } else if (sort === "lastReviewedAt:asc") {
    // Null-first: fetch nulls and non-nulls separately
    const [nullTopics, nonNullTopics] = await Promise.all([
      prisma.topic.findMany({
        where: { ...where, lastReviewedAt: null },
        include: { course: { select: { id: true, name: true, color: true } } },
      }),
      prisma.topic.findMany({
        where: { ...where, lastReviewedAt: { not: null } },
        include: { course: { select: { id: true, name: true, color: true } } },
        orderBy: { lastReviewedAt: "asc" },
      }),
    ]);
    topics = [...nullTopics, ...nonNullTopics];
  } else if (sort === "lastReviewedAt:desc") {
    topics = await prisma.topic.findMany({
      where: { ...where, lastReviewedAt: { not: null } },
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { lastReviewedAt: "desc" },
    });
    const nullTopics = await prisma.topic.findMany({
      where: { ...where, lastReviewedAt: null },
      include: { course: { select: { id: true, name: true, color: true } } },
    });
    topics = [...topics, ...nullTopics];
  } else if (sort === "srs") {
    const now = new Date();
    // Only SCANNING and HARDENED topics participate in SRS
    const srsWhere = { ...where, mastery: { in: [Mastery.SCANNING, Mastery.HARDENED] } };
    topics = await prisma.topic.findMany({
      where: { ...srsWhere, nextReviewAt: { lte: now } },
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { nextReviewAt: "asc" },
    });
  } else {
    topics = await prisma.topic.findMany({
      where,
      include: { course: { select: { id: true, name: true, color: true } } },
    });
  }

  return successResponse(topics);
}
