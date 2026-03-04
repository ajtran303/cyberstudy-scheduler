import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateAssignmentSchema } from "@/lib/schemas/assignment";
import { addDaysLeft } from "@/lib/utils";
import { AssignmentStatus, Prisma } from "@/generated/prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return errorResponse("NOT_FOUND", "Course not found", 404);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Prisma.AssignmentWhereInput = { courseId };
  if (status) where.status = status as AssignmentStatus;

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: [
      { status: "asc" }, // PENDING before DONE
      { dueDate: "asc" },
    ],
  });

  return successResponse(assignments.map(addDaysLeft));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return errorResponse("NOT_FOUND", "Course not found", 404);

  try {
    const body = await req.json();
    const parsed = CreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const { dueDate, ...rest } = parsed.data;
    const assignment = await prisma.assignment.create({
      data: {
        ...rest,
        courseId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return successResponse(addDaysLeft(assignment), 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to create assignment", 500);
  }
}
