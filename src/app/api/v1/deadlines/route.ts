import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { daysLeft } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const [assignments, exams] = await Promise.all([
    prisma.assignment.findMany({
      where: { course: { userId: user.id } },
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.exam.findMany({
      where: { course: { userId: user.id } },
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const items = [
    ...assignments.map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      name: a.name,
      dueDate: a.dueDate?.toISOString() ?? null,
      done: a.status === "DONE",
      description: a.description,
      daysLeft: daysLeft(a.dueDate),
      courseId: a.course.id,
      courseName: a.course.name,
      courseColor: a.course.color,
    })),
    ...exams.map((e) => ({
      id: e.id,
      kind: "exam" as const,
      name: e.name,
      dueDate: e.date?.toISOString() ?? null,
      done: e.status === "COMPLETED",
      description: e.description,
      daysLeft: daysLeft(e.date),
      courseId: e.course.id,
      courseName: e.course.name,
      courseColor: e.course.color,
    })),
  ];

  return successResponse(items);
}
