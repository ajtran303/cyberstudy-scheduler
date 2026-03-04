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
import { WelcomeBanner } from "@/components/welcome-banner";

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

  return (
    <div className="space-y-6">
      <WelcomeBanner name={session.user.name || "Student"} />

      <Tabs defaultValue="courses" className="w-full">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

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

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
