import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateTeachItBackSchema } from "@/lib/schemas/teach-it-back";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id: topicId } = await params;
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, course: { userId: user.id } },
  });
  if (!topic) return errorResponse("NOT_FOUND", "Topic not found", 404);

  try {
    const body = await req.json();
    const parsed = CreateTeachItBackSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const entry = await prisma.teachItBack.create({
      data: {
        topicId,
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
      },
    });

    return successResponse(entry, 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to log Teach It Back", 500);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id: topicId } = await params;
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, course: { userId: user.id } },
  });
  if (!topic) return errorResponse("NOT_FOUND", "Topic not found", 404);

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "5");

  const entries = await prisma.teachItBack.findMany({
    where: { topicId },
    orderBy: { attemptedAt: "desc" },
    take: limit,
  });

  return successResponse(entries);
}
