"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  id: string;
  name: string;
  color: string;
}

interface StudySession {
  id: string;
  courseId: string | null;
  course: { id: string; name: string; color: string } | null;
  startedAt: string;
  durationMinutes: number | null;
  notes: string | null;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

const NO_COURSE = "__none__";

export function StudySessionPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerCourseId, setTimerCourseId] = useState<string>(NO_COURSE);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerNotes, setTimerNotes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry state
  const [manualCourseId, setManualCourseId] = useState<string>(NO_COURSE);
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualDuration, setManualDuration] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Form errors
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  // Edit dialog state
  const [editSession, setEditSession] = useState<StudySession | null>(null);
  const [editCourseId, setEditCourseId] = useState<string>(NO_COURSE);
  const [editDate, setEditDate] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [coursesRes, sessionsRes] = await Promise.all([
      fetch("/api/v1/courses"),
      fetch("/api/v1/study-sessions?limit=10"),
    ]);
    const coursesJson = await coursesRes.json();
    const sessionsJson = await sessionsRes.json();
    setCourses(
      (coursesJson.data ?? []).map((c: Course) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }))
    );
    setSessions(sessionsJson.data?.sessions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerStart) {
      intervalRef.current = setInterval(() => {
        setElapsed(
          Math.floor((Date.now() - timerStart.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerStart]);

  async function startTimer() {
    const now = new Date();
    setTimerStart(now);
    setElapsed(0);
    setTimerRunning(true);
  }

  async function stopTimer() {
    if (!timerStart) return;
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const endedAt = new Date();
    const body: Record<string, unknown> = {
      startedAt: timerStart.toISOString(),
      endedAt: endedAt.toISOString(),
    };
    if (timerCourseId !== NO_COURSE) body.courseId = timerCourseId;
    if (timerNotes.trim()) body.notes = timerNotes.trim();

    const res = await fetch("/api/v1/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Study session saved");
      setTimerStart(null);
      setElapsed(0);
      setTimerNotes("");
      loadData();
    } else {
      toast.error("Failed to save session");
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const duration = parseInt(manualDuration, 10);
    if (!duration || duration < 1 || duration > 1440) {
      setManualErrors({ duration: "Enter a valid duration (1-1440 minutes)" });
      return;
    }
    setManualErrors({});

    const body: Record<string, unknown> = {
      startedAt: new Date(manualDate + "T12:00:00").toISOString(),
      durationMinutes: duration,
    };
    if (manualCourseId !== NO_COURSE) body.courseId = manualCourseId;
    if (manualNotes.trim()) body.notes = manualNotes.trim();

    const res = await fetch("/api/v1/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Study session logged");
      setManualDuration("");
      setManualNotes("");
      loadData();
    } else {
      toast.error("Failed to log session");
    }
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/v1/study-sessions/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Session deleted");
      loadData();
    } else {
      toast.error("Failed to delete session");
    }
  }

  function openEditDialog(session: StudySession) {
    setEditSession(session);
    setEditCourseId(session.courseId ?? NO_COURSE);
    setEditDate(new Date(session.startedAt).toISOString().slice(0, 10));
    setEditDuration(String(session.durationMinutes ?? ""));
    setEditNotes(session.notes ?? "");
  }

  async function submitEdit() {
    if (!editSession) return;
    setEditSaving(true);

    const body: Record<string, unknown> = {};
    const newCourseId = editCourseId === NO_COURSE ? null : editCourseId;
    if (newCourseId !== (editSession.courseId ?? null)) body.courseId = newCourseId;

    const newDuration = parseInt(editDuration, 10);
    if (newDuration && newDuration !== editSession.durationMinutes) {
      body.durationMinutes = newDuration;
    }

    const newNotes = editNotes.trim() || null;
    if (newNotes !== (editSession.notes ?? null)) body.notes = newNotes;

    if (Object.keys(body).length === 0) {
      setEditSession(null);
      setEditSaving(false);
      return;
    }

    const res = await fetch(`/api/v1/study-sessions/${editSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setEditSaving(false);
    if (res.ok) {
      toast.success("Session updated");
      setEditSession(null);
      loadData();
    } else {
      toast.error("Failed to update session");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-9 w-full" />
          <div className="flex flex-col items-center gap-4 py-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-11 w-40 rounded-md" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="timer" className="flex-1">
            Timer
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="mt-4 space-y-4">
          <div>
            <Label htmlFor="timer-course">Course (optional)</Label>
            <Select
              value={timerCourseId}
              onValueChange={setTimerCourseId}
              disabled={timerRunning}
            >
              <SelectTrigger id="timer-course" className="mt-1">
                <SelectValue placeholder="No course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COURSE}>No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-4xl font-mono tabular-nums tracking-wider">
              {formatElapsed(elapsed)}
            </div>

            {!timerRunning ? (
              <Button
                onClick={startTimer}
                size="lg"
                className="min-h-[44px] min-w-[160px]"
              >
                Start Session
              </Button>
            ) : (
              <Button
                onClick={stopTimer}
                size="lg"
                variant="destructive"
                className="min-h-[44px] min-w-[160px]"
              >
                Stop &amp; Save
              </Button>
            )}
          </div>

          {timerRunning && (
            <div>
              <Label htmlFor="timer-notes">Notes (optional)</Label>
              <Textarea
                id="timer-notes"
                placeholder="What are you studying?"
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <form onSubmit={submitManual} className="space-y-4">
            <div>
              <Label htmlFor="manual-course">Course (optional)</Label>
              <Select
                value={manualCourseId}
                onValueChange={setManualCourseId}
              >
                <SelectTrigger id="manual-course" className="mt-1">
                  <SelectValue placeholder="No course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="manual-duration">Duration (minutes)</Label>
              <Input
                id="manual-duration"
                type="number"
                min={1}
                max={1440}
                placeholder="e.g. 45"
                value={manualDuration}
                onChange={(e) => { setManualDuration(e.target.value); setManualErrors({}); }}
                className="mt-1"
                aria-invalid={!!manualErrors.duration}
              />
              {manualErrors.duration && <p className="text-xs text-destructive mt-1">{manualErrors.duration}</p>}
            </div>

            <div>
              <Label htmlFor="manual-notes">Notes (optional)</Label>
              <Textarea
                id="manual-notes"
                placeholder="What did you study?"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full min-h-[44px]">
              Log Session
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Recent Sessions
        </h3>
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No sessions yet
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-sm text-left transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => openEditDialog(s)}
              >
                {s.course ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.course.color }}
                  />
                ) : (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium truncate">
                      {s.course?.name ?? "General"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(s.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {s.notes}
                    </p>
                  )}
                </div>
                <span className="text-xs font-mono shrink-0">
                  {s.durationMinutes ? formatDuration(s.durationMinutes) : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={!!editSession} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-course">Course</Label>
              <Select value={editCourseId} onValueChange={setEditCourseId}>
                <SelectTrigger id="edit-course" className="mt-1">
                  <SelectValue placeholder="No course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1"
                disabled
              />
            </div>

            <div>
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input
                id="edit-duration"
                type="number"
                min={1}
                max={1440}
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="What did you study?"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (editSession) {
                  deleteSession(editSession.id);
                  setEditSession(null);
                }
              }}
            >
              Delete
            </Button>
            <Button onClick={submitEdit} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
