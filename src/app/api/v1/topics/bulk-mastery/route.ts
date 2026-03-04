import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { BulkMasterySchema } from "@/lib/schemas/topic";

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = BulkMasterySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const updated = [];
    for (const update of parsed.data.updates) {
      const existing = await prisma.topic.findFirst({
        where: { id: update.id, course: { userId: user.id } },
      });
      if (!existing) continue;

      const topic = await prisma.topic.update({
        where: { id: update.id },
        data: {
          mastery: update.mastery,
          lastReviewedAt: new Date(),
        },
      });
      updated.push(topic);
    }

    return successResponse(updated);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to bulk update mastery", 500);
  }
}
