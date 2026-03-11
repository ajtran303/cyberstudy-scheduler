import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TopicList } from "@/components/topic-list";
import { ReviewTable } from "@/components/review-table";
import { AssignmentList } from "@/components/assignment-list";
import { ExamList } from "@/components/exam-list";
import { EditCourseDialog } from "@/components/edit-course-dialog";
import { DeleteCourseDialog } from "@/components/delete-course-dialog";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: { id, userId: session.user.id },
    include: {
      topics: { orderBy: { sortOrder: "asc" } },
      assignments: { orderBy: { dueDate: "asc" } },
      exams: { orderBy: { date: "asc" } },
    },
  });

  if (!course) notFound();

  const statusLabels: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: course.color }}
            />
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <Badge variant="secondary">{statusLabels[course.status]}</Badge>
            <EditCourseDialog
              course={{
                id: course.id,
                name: course.name,
                courseCode: course.courseCode,
                color: course.color,
                professorName: course.professorName,
                professorEmail: course.professorEmail,
                website: course.website,
                status: course.status,
              }}
            />
            <DeleteCourseDialog courseId={course.id} courseName={course.name} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {course.courseCode && (
              <span className="font-mono">{course.courseCode}</span>
            )}
            {course.professorName && <span>{course.professorName}</span>}
            {course.professorEmail && (
              <a href={`mailto:${course.professorEmail}`} className="hover:underline truncate max-w-full">
                {course.professorEmail}
              </a>
            )}
            {course.website && (
              <a href={course.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="topics" className="w-full min-w-0">
        <TabsList className="w-full">
          <TabsTrigger value="review" className="flex-1">
            Flashcard Review
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex-1">
            Topics ({course.topics.length})
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex-1">
            Exams ({course.exams.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1">
            <span className="sm:hidden">Tasks</span>
            <span className="hidden sm:inline">Assignments</span>
            {" "}({course.assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <TopicList
            courseId={course.id}
            topics={course.topics.map((t) => ({
              id: t.id,
              name: t.name,
              date: t.date?.toISOString() ?? null,
              details: t.details,
              mastery: t.mastery as "NOT_STARTED" | "LEARNING" | "PROFICIENT" | "MASTERED",
              lastReviewedAt: t.lastReviewedAt?.toISOString() ?? null,
            }))}
          />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewTable courseId={course.id} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentList courseId={course.id} />
        </TabsContent>

        <TabsContent value="exams" className="mt-4">
          <ExamList courseId={course.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
