import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { seedDemoUser } from "@/lib/demo-seed";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.email !== "demo@example.com") {
    return errorResponse("FORBIDDEN", "This endpoint is only available for the demo account", 403);
  }

  try {
    // Delete study sessions first (SetNull on course FK means they won't cascade)
    await prisma.studySession.deleteMany({ where: { userId: user.id } });
    // Delete courses — cascades to topics, assignments, exams, teach-it-backs, quiz attempts
    await prisma.course.deleteMany({ where: { userId: user.id } });
    // Re-seed demo data
    await seedDemoUser(prisma);

    return successResponse({ message: "Demo data reset" });
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to reset demo data", 500);
  }
}
