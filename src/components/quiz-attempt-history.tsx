"use client";

interface QuizAttemptEntry {
  id: string;
  correct: boolean;
  questionText: string | null;
  sessionId: string | null;
  createdAt: string;
}

export function QuizAttemptHistory({ entries }: { entries: QuizAttemptEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No quiz attempts yet</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-md bg-muted p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={entry.correct ? "text-[#10b981]" : "text-[#ef4444]"}>
              {entry.correct ? "Correct" : "Incorrect"}
            </span>
            <span className="text-muted-foreground">
              {new Date(entry.createdAt).toLocaleDateString()}
            </span>
            {entry.sessionId && (
              <span className="font-mono text-muted-foreground">
                {entry.sessionId}
              </span>
            )}
          </div>
          {entry.questionText && (
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.questionText}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
