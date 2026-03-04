import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return errorResponse("VALIDATION_ERROR", "sessionId parameter is required", 422);
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      sessionId,
      topic: { course: { userId: user.id } },
    },
    include: {
      topic: { select: { id: true, name: true, courseId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return successResponse(attempts);
}
