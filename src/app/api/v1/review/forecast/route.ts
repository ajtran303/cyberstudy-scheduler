import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  const topics = await prisma.topic.findMany({
    where: {
      course: { userId: user.id },
      OR: [
        { nextReviewAt: { lte: horizon } },
        { nextReviewAt: null },
      ],
    },
    select: { nextReviewAt: true },
  });

  // Build 14-day buckets
  const buckets: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    buckets.push({
      date: d.toISOString().slice(0, 10),
      count: 0,
    });
  }

  const todayStr = buckets[0].date;

  for (const topic of topics) {
    if (!topic.nextReviewAt || topic.nextReviewAt <= now) {
      // Overdue or never scheduled → today's bucket
      buckets[0].count++;
    } else {
      const dateStr = topic.nextReviewAt.toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.date === dateStr);
      if (bucket) bucket.count++;
      // Beyond 14 days — not included
    }
  }

  return successResponse(buckets);
}
