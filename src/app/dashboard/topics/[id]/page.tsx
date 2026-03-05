import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { MasteryBadge } from "@/components/mastery-badge";
import { MasterySelector } from "@/components/mastery-selector";
import { KeyTermsEditor } from "@/components/key-terms-editor";
import { TopicDetailsEditor } from "@/components/topic-details-editor";
import { EditTopicDialog } from "@/components/edit-topic-dialog";
import { DeleteTopicDialog } from "@/components/delete-topic-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface KeyTerm {
  term: string;
  definition: string;
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, course: { userId: session.user.id } },
    include: {
      course: { select: { id: true, name: true, color: true } },
      teachItBacks: { orderBy: { attemptedAt: "desc" }, take: 5 },
      quizAttempts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!topic) notFound();

  const keyTerms = (topic.keyTerms as KeyTerm[] | null) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/dashboard/courses/${topic.courseId}`}>{topic.course.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{topic.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{topic.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <MasteryBadge mastery={topic.mastery as "EXPOSED" | "SCANNING" | "HARDENED" | "CLASSIFIED"} />
              {topic.lastReviewedAt && (
                <span className="text-xs text-muted-foreground">
                  Last reviewed: {formatDate(topic.lastReviewedAt)}
                </span>
              )}
              {topic.date && (
                <span className="text-xs text-muted-foreground">
                  Scheduled: {formatDate(topic.date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <EditTopicDialog topicId={topic.id} name={topic.name} date={topic.date ? topic.date.toISOString() : null}>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Edit topic">
                <Pencil className="h-4 w-4" />
              </Button>
            </EditTopicDialog>
            <DeleteTopicDialog topicId={topic.id} courseId={topic.courseId} name={topic.name}>
              <Button variant="ghost" size="icon" className="size-11 text-destructive hover:text-destructive" aria-label="Delete topic">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteTopicDialog>
          </div>
        </div>
      </div>

      {/* Mastery Rating */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Mastery Rating</h2>
        <MasterySelector
          topicId={topic.id}
          currentMastery={topic.mastery}
        />
      </div>

      <Separator />

      <TopicDetailsEditor
        topicId={topic.id}
        initialDetails={topic.details}
        initialNotes={topic.notes}
      />

      {/* Key Terms */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Key Terms</h2>
        <KeyTermsEditor topicId={topic.id} initialTerms={keyTerms} />
      </div>

      <Separator />

      {/* Teach It Back History */}
      <div>
        <h2 className="text-sm font-semibold mb-2">
          Teach It Back History ({topic.teachItBacks.length})
        </h2>
        <div id="teach-it-back-section" />
        {topic.teachItBacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet</p>
        ) : (
          <div className="space-y-2">
            {topic.teachItBacks.map((tib) => (
              <div key={tib.id} className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className={
                    tib.outcome === "PASS" ? "text-mastery-hardened" :
                    tib.outcome === "PARTIAL" ? "text-mastery-scanning" :
                    "text-mastery-exposed"
                  }>
                    {tib.outcome}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(tib.attemptedAt)}
                  </span>
                </div>
                {tib.notes && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {tib.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Attempts History */}
      <div>
        <h2 className="text-sm font-semibold mb-2">
          Quiz Attempts ({topic.quizAttempts.length})
        </h2>
        {topic.quizAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts yet</p>
        ) : (
          <div className="space-y-2">
            {topic.quizAttempts.map((qa) => (
              <div key={qa.id} className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className={qa.correct ? "text-mastery-hardened" : "text-mastery-exposed"}>
                    {qa.correct ? "Correct" : "Incorrect"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(qa.createdAt)}
                  </span>
                  {qa.sessionId && (
                    <span className="font-mono text-muted-foreground">
                      {qa.sessionId}
                    </span>
                  )}
                </div>
                {qa.questionText && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {qa.questionText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
