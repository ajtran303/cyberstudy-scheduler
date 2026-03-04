import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateReviewSchema } from "@/lib/schemas/review";
import { computeSrs } from "@/lib/srs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.topic.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Topic not found", 404);

  try {
    const body = await req.json();
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const srs = computeSrs({
      quality: parsed.data.quality,
      currentInterval: existing.reviewInterval,
      currentEaseFactor: existing.easeFactor,
    });

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        nextReviewAt: srs.nextReviewAt,
        reviewInterval: srs.nextInterval,
        easeFactor: srs.nextEaseFactor,
      },
    });

    return successResponse(topic);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to record review", 500);
  }
}
