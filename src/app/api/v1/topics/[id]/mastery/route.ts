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
      return errorResponse("VALIDATION_ERROR", parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        mastery: parsed.data.mastery,
        lastReviewedAt: new Date(),
      },
    });

    return successResponse(topic);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update mastery", 500);
  }
}
