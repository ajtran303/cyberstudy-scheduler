import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-helpers";
import { seedDemoUser } from "@/lib/demo-seed";

export async function POST() {
  try {
    // Find (or let seedDemoUser upsert) the demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: "demo@example.com" },
    });

    if (demoUser) {
      // Delete study sessions first (SetNull on course FK means they won't cascade)
      await prisma.studySession.deleteMany({ where: { userId: demoUser.id } });
      // Delete courses — cascades to topics, assignments, exams, teach-it-backs, quiz attempts
      await prisma.course.deleteMany({ where: { userId: demoUser.id } });
    }

    // Re-seed (upserts the user if it doesn't exist yet)
    await seedDemoUser(prisma);

    return successResponse({ message: "Demo data reset" });
  } catch {
    return errorResponse("INTERNAL_ERROR", "Failed to reset demo data", 500);
  }
}
