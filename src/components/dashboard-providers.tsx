"use client";

import { StudyTimerProvider } from "@/contexts/study-timer-context";
import type { ReactNode } from "react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return <StudyTimerProvider>{children}</StudyTimerProvider>;
}
