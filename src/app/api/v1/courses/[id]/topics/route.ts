import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { CreateTopicSchema } from "@/lib/schemas/topic";
import { parseSort } from "@/lib/schemas/common";
import { Mastery, Prisma } from "@/generated/prisma/client";

const ALLOWED_SORTS = ["date:asc", "date:desc", "lastReviewedAt:asc", "lastReviewedAt:desc", "sortOrder:asc"];

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
  const mastery = url.searchParams.get("mastery");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const sort = parseSort(url.searchParams.get("sort"), ALLOWED_SORTS, "sortOrder:asc");

  const where: Prisma.TopicWhereInput = { courseId };

  if (mastery) {
    where.mastery = mastery as Mastery;
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const orderBy: Prisma.TopicOrderByWithRelationInput = {
    [sort.field]: sort.direction,
  };

  const topics = await prisma.topic.findMany({
    where,
    orderBy,
  });

  return successResponse(topics);
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
    const parsed = CreateTopicSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const { date, ...rest } = parsed.data;
    const topic = await prisma.topic.create({
      data: {
        ...rest,
        courseId,
        date: date ? new Date(date) : null,
        keyTerms: rest.keyTerms || null,
      },
    });

    return successResponse(topic, 201);
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to create topic", 500);
  }
}
