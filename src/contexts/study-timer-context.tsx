"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "study-timer";

interface TimerState {
  startedAt: number; // epoch ms
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  notes: string;
}

interface StudyTimerContextValue {
  isRunning: boolean;
  elapsed: number;
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  notes: string;
  startTimer: (courseId: string | null, courseName: string | null, courseColor: string | null) => void;
  stopTimer: () => Promise<boolean>;
  discardTimer: () => void;
  setNotes: (notes: string) => void;
}

const StudyTimerContext = createContext<StudyTimerContextValue | null>(null);

function readStorage(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

function writeStorage(state: TimerState | null) {
  if (typeof window === "undefined") return;
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState | null>(() => readStorage());
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync elapsed from startedAt
  useEffect(() => {
    if (timerState) {
      // Set initial elapsed immediately
      setElapsed(Math.floor((Date.now() - timerState.startedAt) / 1000));

      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerState.startedAt) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setTimerState(e.newValue ? (JSON.parse(e.newValue) as TimerState) : null);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const startTimer = useCallback(
    (courseId: string | null, courseName: string | null, courseColor: string | null) => {
      const state: TimerState = {
        startedAt: Date.now(),
        courseId,
        courseName,
        courseColor,
        notes: "",
      };
      writeStorage(state);
      setTimerState(state);
    },
    []
  );

  const stopTimer = useCallback(async (): Promise<boolean> => {
    if (!timerState) return false;

    const endedAt = new Date();
    const body: Record<string, unknown> = {
      startedAt: new Date(timerState.startedAt).toISOString(),
      endedAt: endedAt.toISOString(),
    };
    if (timerState.courseId) body.courseId = timerState.courseId;
    if (timerState.notes.trim()) body.notes = timerState.notes.trim();

    try {
      const res = await fetch("/api/v1/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Study session saved");
        writeStorage(null);
        setTimerState(null);
        return true;
      }
      toast.error("Failed to save session");
      return false;
    } catch {
      toast.error("Network error");
      return false;
    }
  }, [timerState]);

  const discardTimer = useCallback(() => {
    writeStorage(null);
    setTimerState(null);
  }, []);

  const setNotes = useCallback(
    (notes: string) => {
      setTimerState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, notes };
        writeStorage(next);
        return next;
      });
    },
    []
  );

  return (
    <StudyTimerContext.Provider
      value={{
        isRunning: timerState !== null,
        elapsed,
        courseId: timerState?.courseId ?? null,
        courseName: timerState?.courseName ?? null,
        courseColor: timerState?.courseColor ?? null,
        notes: timerState?.notes ?? "",
        startTimer,
        stopTimer,
        discardTimer,
        setNotes,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer(): StudyTimerContextValue {
  const ctx = useContext(StudyTimerContext);
  if (!ctx) throw new Error("useStudyTimer must be used within StudyTimerProvider");
  return ctx;
}
