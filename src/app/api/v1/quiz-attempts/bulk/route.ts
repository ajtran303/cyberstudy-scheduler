import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { BulkCreateQuizAttemptsSchema } from "@/lib/schemas/quiz-attempt";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON", 422);
  }

  const parsed = BulkCreateQuizAttemptsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      parsed.error.issues.map((e) => e.message).join(", "),
      422
    );
  }

  const { sessionId, attempts } = parsed.data;

  // Verify all referenced topics belong to this user
  const topicIds = [...new Set(attempts.map((a) => a.topicId))];
  const ownedTopics = await prisma.topic.findMany({
    where: { id: { in: topicIds }, course: { userId: user.id } },
    select: { id: true },
  });
  const ownedIds = new Set(ownedTopics.map((t) => t.id));
  const missing = topicIds.filter((id) => !ownedIds.has(id));

  if (missing.length > 0) {
    return errorResponse(
      "NOT_FOUND",
      `Topics not found: ${missing.join(", ")}`,
      404
    );
  }

  const created = await prisma.quizAttempt.createManyAndReturn({
    data: attempts.map((a) => ({
      topicId: a.topicId,
      correct: a.correct,
      questionText: a.questionText,
      sessionId,
    })),
  });

  return successResponse(created, 201);
}
