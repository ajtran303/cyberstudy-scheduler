import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateExamSchema } from "@/lib/schemas/exam";
import { addDaysLeft, toNoonUTC } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.exam.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Exam not found", 404);

  try {
    const body = await req.json();
    const parsed = UpdateExamSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const { date, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (date !== undefined) {
      updateData.date = date ? toNoonUTC(date) : null;
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    return successResponse(addDaysLeft(exam));
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update exam", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.exam.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Exam not found", 404);

  await prisma.exam.delete({ where: { id } });
  return successResponse({ deleted: true });
}
