import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "@/components/create-course-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewTable } from "@/components/review-table";
import { CalendarView } from "@/components/calendar-view";
import { AnalyticsChart } from "@/components/analytics-chart";
import { StudySessionPanel } from "@/components/study-session-panel";
import { FlashcardDeck } from "@/components/flashcard-deck";
import { StudyStatsChart } from "@/components/study-stats-chart";
import { ReviewForecastChart } from "@/components/review-forecast-chart";
import { WelcomeBanner } from "@/components/welcome-banner";
import { TodayPlan } from "@/components/today-plan";
import { StudyStats } from "@/components/study-stats";

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
  // Use UTC-based calculation so noon-UTC stored dates are matched correctly
  const threeDaysFromNow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3, 23, 59, 59)
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
        mastery: { in: ["SCANNING", "HARDENED"] },
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

      <Tabs defaultValue="today" className="w-full">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-initial">Today</TabsTrigger>
            <TabsTrigger value="review" className="flex-1 sm:flex-initial">Review</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 sm:flex-initial">Courses</TabsTrigger>
          </TabsList>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="flashcards" className="flex-1 sm:flex-initial">Flashcards</TabsTrigger>
            <TabsTrigger value="study" className="flex-1 sm:flex-initial">Study</TabsTrigger>
          </TabsList>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="calendar" className="flex-1 sm:flex-initial">Calendar</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 sm:flex-initial">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="mt-4">
          <TodayPlan />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
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
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewTable />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <CalendarView />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-6">
          <StudyStats />
          <AnalyticsChart />
          <ReviewForecastChart />
        </TabsContent>

        <TabsContent value="study" className="mt-4 space-y-6">
          <StudyStatsChart />
          <StudySessionPanel />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          <FlashcardDeck />
        </TabsContent>
      </Tabs>
    </div>
  );
}
