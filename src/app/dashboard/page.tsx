import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "@/components/create-course-dialog";
import { Button } from "@/components/ui/button";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { InsightsTabs } from "@/components/insights-tabs";
import { StudySessionPanel } from "@/components/study-session-panel";
import { FlashcardDeck } from "@/components/flashcard-deck";
import { AllDeadlines } from "@/components/all-assignments";
import { WelcomeBanner } from "@/components/welcome-banner";
import { DailyBriefing } from "@/components/daily-briefing";
import { APP_TIMEZONE, localDatePartsInTz, offsetMsInTz } from "@/lib/tz";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const courses = await prisma.course.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { topics: true, assignments: true, exams: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Gather stats for the welcome banner
  const now = new Date();
  // Compute 3-day-out boundary anchored to America/New_York
  const { year, month, day } = localDatePartsInTz(now, APP_TIMEZONE);
  const offset = offsetMsInTz(now, APP_TIMEZONE);
  const threeDaysFromNow = new Date(
    Date.UTC(year, month, day + 3, 23, 59, 59) - offset
  );

  const [upcomingAssignments, upcomingExams, srsDueCount] = await Promise.all([
    prisma.assignment.count({
      where: {
        course: { userId: session.user.id },
        status: "PENDING",
        dueDate: { lte: threeDaysFromNow },
      },
    }),
    prisma.exam.count({
      where: {
        course: { userId: session.user.id },
        status: "UPCOMING",
        date: { lte: threeDaysFromNow },
      },
    }),
    prisma.topic.count({
      where: {
        course: { userId: session.user.id },
        mastery: { in: ["LEARNING", "PROFICIENT"] },
        OR: [
          { nextReviewAt: null },
          { nextReviewAt: { lte: now } },
        ],
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <WelcomeBanner
        name={session.user.name || "Student"}
        upcomingAssignments={upcomingAssignments}
        upcomingExams={upcomingExams}
        srsDueCount={srsDueCount}
      />

      <DashboardTabs>
        {{
          today: (
            <div className="space-y-6">
              <DailyBriefing />
              <StudySessionPanel />
            </div>
          ),
          courses: (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Courses</h2>
                <CreateCourseDialog>
                  <Button size="sm">+ New Course</Button>
                </CreateCourseDialog>
              </div>
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No courses yet. Create your first course to get started.
                  </p>
                  <CreateCourseDialog>
                    <Button>Create Course</Button>
                  </CreateCourseDialog>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      name={course.name}
                      courseCode={course.courseCode}
                      professorName={course.professorName}
                      status={course.status}
                      color={course.color}
                      _count={course._count}
                    />
                  ))}
                </div>
              )}
            </>
          ),
          deadlines: <AllDeadlines />,
          insights: <InsightsTabs />,
          flashcards: <FlashcardDeck />,
        }}
      </DashboardTabs>
    </div>
  );
}
