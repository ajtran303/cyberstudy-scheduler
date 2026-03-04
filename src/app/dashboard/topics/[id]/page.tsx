import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MasteryBadge } from "@/components/mastery-badge";
import { MasterySelector } from "@/components/mastery-selector";
import { KeyTermsEditor } from "@/components/key-terms-editor";
import { TopicDetailsEditor } from "@/components/topic-details-editor";
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
      <div className="flex items-start gap-4">
        <Link
          href={`/dashboard/courses/${topic.courseId}`}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr;
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: topic.course.color }}
            />
            <Link href={`/dashboard/courses/${topic.courseId}`} className="hover:underline">
              {topic.course.name}
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{topic.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <MasteryBadge mastery={topic.mastery as "EXPOSED" | "SCANNING" | "HARDENED" | "CLASSIFIED"} />
            {topic.lastReviewedAt && (
              <span className="text-xs text-muted-foreground">
                Last reviewed: {new Date(topic.lastReviewedAt).toLocaleDateString()}
              </span>
            )}
            {topic.date && (
              <span className="text-xs text-muted-foreground">
                Scheduled: {new Date(topic.date).toLocaleDateString()}
              </span>
            )}
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
                    {new Date(tib.attemptedAt).toLocaleDateString()}
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
                    {new Date(qa.createdAt).toLocaleDateString()}
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
