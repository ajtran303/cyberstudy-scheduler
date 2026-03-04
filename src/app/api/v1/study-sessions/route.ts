import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateStudySessionSchema } from "@/lib/schemas/study-session";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const where = {
    userId: user.id,
    ...(courseId ? { courseId } : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.studySession.findMany({
      where,
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.studySession.count({ where }),
  ]);

  return successResponse({ sessions, total });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CreateStudySessionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues.map((e) => e.message).join(", "),
        422
      );
    }

    const { courseId, startedAt, endedAt, durationMinutes, notes } = parsed.data;

    // Verify course belongs to user if provided
    if (courseId) {
      const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
      if (!course) return errorResponse("NOT_FOUND", "Course not found", 404);
    }

    // Auto-compute duration from startedAt/endedAt if not provided
    let computedDuration = durationMinutes;
    if (!computedDuration && endedAt) {
      computedDuration = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000
      );
    }

    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        courseId: courseId ?? null,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
        durationMinutes: computedDuration ?? null,
        notes: notes ?? null,
      },
      include: { course: { select: { id: true, name: true, color: true } } },
    });

    return successResponse(session, 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to create study session", 500);
  }
}
