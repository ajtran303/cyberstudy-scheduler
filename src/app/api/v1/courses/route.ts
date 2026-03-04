import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateCourseSchema } from "@/lib/schemas/course";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { topics: true, assignments: true, exams: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return successResponse(courses);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CreateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues.map((e) => e.message).join(", "),
        422
      );
    }

    const course = await prisma.course.create({
      data: { ...parsed.data, userId: user.id },
    });

    return successResponse(course, 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to create course", 500);
  }
}
