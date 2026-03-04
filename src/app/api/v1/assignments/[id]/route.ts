import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateAssignmentSchema } from "@/lib/schemas/assignment";
import { addDaysLeft } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.assignment.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Assignment not found", 404);

  try {
    const body = await req.json();
    const parsed = UpdateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const { dueDate, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
    });

    return successResponse(addDaysLeft(assignment));
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update assignment", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.assignment.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Assignment not found", 404);

  await prisma.assignment.delete({ where: { id } });
  return successResponse({ deleted: true });
}
