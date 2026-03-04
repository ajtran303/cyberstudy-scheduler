import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { UpdateTopicSchema } from "@/lib/schemas/topic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const topic = await prisma.topic.findFirst({
    where: { id, course: { userId: user.id } },
    include: { course: { select: { id: true, name: true, color: true } } },
  });

  if (!topic) return errorResponse("NOT_FOUND", "Topic not found", 404);
  return successResponse(topic);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.topic.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Topic not found", 404);

  try {
    const body = await req.json();
    const parsed = UpdateTopicSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((e) => e.message).join(", "), 422);
    }

    const { date, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (date !== undefined) {
      updateData.date = date ? new Date(date) : null;
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: updateData,
    });

    return successResponse(topic);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to update topic", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const existing = await prisma.topic.findFirst({
    where: { id, course: { userId: user.id } },
  });
  if (!existing) return errorResponse("NOT_FOUND", "Topic not found", 404);

  await prisma.topic.delete({ where: { id } });
  return successResponse({ deleted: true });
}
