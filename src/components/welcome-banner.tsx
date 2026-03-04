"use client";

interface WelcomeBannerProps {
  name: string;
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-lg border border-border bg-card p-6 cyber-glow">
      <h1 className="text-2xl font-bold font-mono">
        {greeting}, {name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-mono text-primary">&gt;_</span> Ready to lock down
        some knowledge today?
      </p>
    </div>
  );
}
