"use client";

interface TeachItBackEntry {
  id: string;
  attemptedAt: string;
  outcome: "PASS" | "PARTIAL" | "MISS";
  notes: string | null;
}

const outcomeColors = {
  PASS: "text-[#10b981]",
  PARTIAL: "text-[#f59e0b]",
  MISS: "text-[#ef4444]",
};

export function TeachItBackHistory({ entries }: { entries: TeachItBackEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No Teach It Back sessions yet</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-md bg-muted p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={outcomeColors[entry.outcome]}>{entry.outcome}</span>
            <span className="text-muted-foreground">
              {new Date(entry.attemptedAt).toLocaleDateString()}
            </span>
          </div>
          {entry.notes && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {entry.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
