import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateExamSchema } from "@/lib/schemas/exam";
import { addDaysLeft } from "@/lib/utils";
import { ExamStatus, Prisma } from "@/generated/prisma/client";

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

  const where: Prisma.ExamWhereInput = { courseId };
  if (status) where.status = status as ExamStatus;

  const exams = await prisma.exam.findMany({
    where,
    orderBy: [
      { status: "asc" }, // UPCOMING before COMPLETED
      { date: "asc" },
    ],
  });

  return successResponse(exams.map(addDaysLeft));
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
    const parsed = CreateExamSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const { date, ...rest } = parsed.data;
    const exam = await prisma.exam.create({
      data: {
        ...rest,
        courseId,
        date: date ? new Date(date) : null,
      },
    });

    return successResponse(addDaysLeft(exam), 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to create exam", 500);
  }
}
