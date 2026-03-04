import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { BatchImportSchema } from "@/lib/schemas/course";
import { Prisma } from "@/generated/prisma/client";

type BatchResult = {
  index: number;
  id: string | null;
  status: "created" | "failed";
  error?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id: courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: user.id },
  });
  if (!course) return errorResponse("NOT_FOUND", "Course not found", 404);

  try {
    const body = await req.json();
    const parsed = BatchImportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues.map((e) => e.message).join(", "),
        422
      );
    }

    const results: { topics: BatchResult[]; assignments: BatchResult[]; exams: BatchResult[] } = {
      topics: [],
      assignments: [],
      exams: [],
    };
    let hasFailure = false;

    // Process topics
    if (parsed.data.topics) {
      for (let i = 0; i < parsed.data.topics.length; i++) {
        const t = parsed.data.topics[i];
        try {
          const topic = await prisma.topic.create({
            data: {
              courseId,
              name: t.name,
              date: t.date ? new Date(t.date) : null,
              details: t.details,
              notes: t.notes,
              keyTerms: t.keyTerms ? (t.keyTerms as unknown as Prisma.InputJsonValue) : undefined,
              sortOrder: i,
            },
          });
          results.topics.push({ index: i, id: topic.id, status: "created" });
        } catch (err) {
          hasFailure = true;
          results.topics.push({
            index: i,
            id: null,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    // Process assignments
    if (parsed.data.assignments) {
      for (let i = 0; i < parsed.data.assignments.length; i++) {
        const a = parsed.data.assignments[i];
        try {
          const assignment = await prisma.assignment.create({
            data: {
              courseId,
              name: a.name,
              dueDate: a.dueDate ? new Date(a.dueDate) : null,
              description: a.description,
              sortOrder: i,
            },
          });
          results.assignments.push({ index: i, id: assignment.id, status: "created" });
        } catch (err) {
          hasFailure = true;
          results.assignments.push({
            index: i,
            id: null,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    // Process exams
    if (parsed.data.exams) {
      for (let i = 0; i < parsed.data.exams.length; i++) {
        const e = parsed.data.exams[i];
        try {
          const exam = await prisma.exam.create({
            data: {
              courseId,
              name: e.name,
              date: e.date ? new Date(e.date) : null,
              description: e.description,
              sortOrder: i,
            },
          });
          results.exams.push({ index: i, id: exam.id, status: "created" });
        } catch (err) {
          hasFailure = true;
          results.exams.push({
            index: i,
            id: null,
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    const status = hasFailure ? 207 : 201;
    return NextResponse.json({ data: results, error: null }, { status });
  } catch {
    return errorResponse("INTERNAL_ERROR", "Batch import failed", 500);
  }
}
