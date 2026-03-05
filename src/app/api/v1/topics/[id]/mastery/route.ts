import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateMasterySchema } from "@/lib/schemas/topic";

export async function PATCH(
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
    const parsed = UpdateMasterySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const newMastery = parsed.data.mastery;
    const oldMastery = existing.mastery;

    // Build SRS fields based on mastery transition
    const srsData: Record<string, unknown> = {};
    if (newMastery === "SCANNING" && oldMastery === "EXPOSED") {
      // Entering SRS: initialize scheduling
      srsData.nextReviewAt = new Date();
      srsData.reviewInterval = 0;
      srsData.easeFactor = 2.5;
    } else if (newMastery === "CLASSIFIED" || newMastery === "EXPOSED") {
      // Exiting SRS: clear next review
      srsData.nextReviewAt = null;
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        mastery: newMastery,
        lastReviewedAt: new Date(),
        ...srsData,
      },
    });

    return successResponse(topic);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update mastery", 500);
  }
}
