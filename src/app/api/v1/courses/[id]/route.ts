import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateCourseSchema } from "@/lib/schemas/course";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: { select: { topics: true, assignments: true, exams: true } },
    },
  });

  if (!course) return errorResponse("NOT_FOUND", "Course not found", 404);
  return successResponse(course);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: { id, userId: user.id } });
  if (!existing) return errorResponse("NOT_FOUND", "Course not found", 404);

  try {
    const body = await req.json();
    const parsed = UpdateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const course = await prisma.course.update({
      where: { id },
      data: parsed.data,
    });

    return successResponse(course);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update course", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: { id, userId: user.id } });
  if (!existing) return errorResponse("NOT_FOUND", "Course not found", 404);

  await prisma.course.delete({ where: { id } });
  return successResponse({ deleted: true });
}
