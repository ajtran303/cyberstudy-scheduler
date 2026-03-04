import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateStudySessionSchema } from "@/lib/schemas/study-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const session = await prisma.studySession.findFirst({
    where: { id, userId: user.id },
    include: { course: { select: { id: true, name: true, color: true } } },
  });

  if (!session) return errorResponse("NOT_FOUND", "Study session not found", 404);
  return successResponse(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.studySession.findFirst({ where: { id, userId: user.id } });
  if (!existing) return errorResponse("NOT_FOUND", "Study session not found", 404);

  try {
    const body = await req.json();
    const parsed = UpdateStudySessionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const data: Record<string, unknown> = {};
    const { endedAt, durationMinutes, notes, courseId } = parsed.data;

    if (endedAt !== undefined) data.endedAt = endedAt ? new Date(endedAt) : null;
    if (durationMinutes !== undefined) data.durationMinutes = durationMinutes;
    if (notes !== undefined) data.notes = notes;
    if (courseId !== undefined) data.courseId = courseId;

    // Auto-compute duration when endedAt is set and duration isn't explicitly provided
    if (endedAt && durationMinutes === undefined) {
      data.durationMinutes = Math.round(
        (new Date(endedAt).getTime() - existing.startedAt.getTime()) / 60000
      );
    }

    const session = await prisma.studySession.update({
      where: { id },
      data,
      include: { course: { select: { id: true, name: true, color: true } } },
    });

    return successResponse(session);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update study session", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.studySession.findFirst({ where: { id, userId: user.id } });
  if (!existing) return errorResponse("NOT_FOUND", "Study session not found", 404);

  await prisma.studySession.delete({ where: { id } });
  return successResponse({ deleted: true });
}
