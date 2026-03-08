"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useStudyTimer, formatElapsed } from "@/contexts/study-timer-context";

export function FloatingTimer() {
  const { isRunning, elapsed, courseName, courseColor, stopTimer } = useStudyTimer();
  const [mounted, setMounted] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isRunning) return null;

  async function handleStop() {
    setStopping(true);
    await stopTimer();
    setStopping(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: courseColor ?? "#6366f1" }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: courseColor ?? "#6366f1" }}
        />
      </span>

      <span className="font-mono text-sm tabular-nums">
        {formatElapsed(elapsed)}
      </span>

      {courseName && (
        <span className="text-xs text-muted-foreground max-w-[120px] truncate">
          {courseName}
        </span>
      )}

      <Button
        size="sm"
        variant="destructive"
        className="h-7 rounded-full px-3 text-xs"
        onClick={handleStop}
        disabled={stopping}
      >
        {stopping ? "Saving..." : "Stop"}
      </Button>
    </div>
  );
}
