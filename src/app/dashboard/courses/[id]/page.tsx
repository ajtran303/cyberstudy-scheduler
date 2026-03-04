import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard"
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr;
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: course.color }}
            />
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <Badge variant="secondary">{statusLabels[course.status]}</Badge>
          </div>
          <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
            {course.courseCode && (
              <span className="font-mono">{course.courseCode}</span>
            )}
            {course.professorName && <span>{course.professorName}</span>}
            {course.professorEmail && (
              <a href={`mailto:${course.professorEmail}`} className="hover:underline">
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

      <Tabs defaultValue="topics" className="w-full">
        <TabsList>
          <TabsTrigger value="topics">
            Topics ({course.topics.length})
          </TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({course.assignments.length})
          </TabsTrigger>
          <TabsTrigger value="exams">
            Exams ({course.exams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <div id="topics-section" data-course-id={course.id} />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div id="course-review-section" data-course-id={course.id} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <div id="assignments-section" data-course-id={course.id} />
        </TabsContent>

        <TabsContent value="exams" className="mt-4">
          <div id="exams-section" data-course-id={course.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
