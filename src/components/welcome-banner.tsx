"use client";

interface WelcomeBannerProps {
  name: string;
  reviewCount?: number;
  upcomingAssignments?: number;
  upcomingExams?: number;
  srsDueCount?: number;
}

export function WelcomeBanner({
  name,
  reviewCount = 0,
  upcomingAssignments = 0,
  upcomingExams = 0,
  srsDueCount = 0,
}: WelcomeBannerProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const hints: string[] = [];
  if (srsDueCount > 0) {
    hints.push(
      `${srsDueCount} topic${srsDueCount === 1 ? "" : "s"} due for SRS review`
    );
  }
  if (reviewCount > 0) {
    hints.push(`${reviewCount} topic${reviewCount === 1 ? "" : "s"} due for review`);
  }
  if (upcomingAssignments > 0) {
    hints.push(
      `${upcomingAssignments} assignment${upcomingAssignments === 1 ? "" : "s"} due soon`
    );
  }
  if (upcomingExams > 0) {
    hints.push(
      `${upcomingExams} exam${upcomingExams === 1 ? "" : "s"} coming up`
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 cyber-glow">
      <h1 className="text-2xl font-bold font-mono">
        {greeting}, {name}
      </h1>
      {hints.length > 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono text-primary">&gt;_</span>{" "}
          {hints.join(" · ")}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono text-primary">&gt;_</span> All clear — nice
          work keeping up!
        </p>
      )}
    </div>
  );
}
