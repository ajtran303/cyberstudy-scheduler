"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DaysLeftBadge } from "@/components/days-left-badge";
import { formatDate } from "@/lib/utils";

type ItemKind = "assignment" | "exam";

interface DeadlineItem {
  id: string;
  kind: ItemKind;
  name: string;
  dueDate: string | null;
  done: boolean;
  description: string | null;
  daysLeft: string;
  courseId: string;
  courseName: string;
  courseColor: string | null;
}

export function AllDeadlines() {
  const router = useRouter();
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hideDone, setHideDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/deadlines");
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayed = items
    .filter((a) => !hideDone || !a.done)
    .sort((a, b) => {
      // Overdue pending items first
      const aOverdue = a.daysLeft === "late" && !a.done ? 0 : 1;
      const bOverdue = b.daysLeft === "late" && !b.done ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      // Then by due date, nulls last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const doneCount = items.filter((a) => a.done).length;

  function isOverdue(a: DeadlineItem) {
    return a.daysLeft === "late" && !a.done;
  }

  async function toggleStatus(item: DeadlineItem) {
    const oldItems = [...items];

    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, done: !item.done } : a))
    );

    const endpoint = item.kind === "assignment"
      ? `/api/v1/assignments/${item.id}`
      : `/api/v1/exams/${item.id}`;

    const newStatus = item.kind === "assignment"
      ? (item.done ? "PENDING" : "DONE")
      : (item.done ? "UPCOMING" : "COMPLETED");

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setItems(oldItems);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update status");
        return;
      }

      router.refresh();
      const label = item.done ? "pending" : "done";
      toast.success(`Marked as ${label}`, {
        action: {
          label: "Undo",
          onClick: () => toggleStatus({ ...item, done: !item.done }),
        },
      });
    } catch {
      setItems(oldItems);
      toast.error("Could not update status");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load deadlines</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {doneCount}/{items.length} done
        </h3>
        <Button
          variant={hideDone ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setHideDone(!hideDone)}
        >
          {hideDone ? (
            <><Eye className="h-3.5 w-3.5 mr-1" /> Show all</>
          ) : (
            <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide done</>
          )}
        </Button>
      </div>

      <div className="space-y-1">
        {displayed.map((a) => (
          <div
            key={`${a.kind}-${a.id}`}
            className={`flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
              a.done
                ? "opacity-50"
                : isOverdue(a)
                ? "bg-destructive/5 border border-destructive/20 hover:bg-destructive/10"
                : "hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => toggleStatus(a)}
                className="flex items-center justify-center size-11 shrink-0 -m-3.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                aria-label={a.done ? `Mark ${a.name} as pending` : `Mark ${a.name} as done`}
              >
                <span
                  className={`h-4 w-4 rounded border transition-colors ${
                    a.done
                      ? "bg-primary border-primary"
                      : "border-muted-foreground hover:border-primary"
                  }`}
                />
              </button>
              <Link href={`/dashboard/courses/${a.courseId}`} className="min-w-0 flex-1">
                <p className={`text-sm font-medium flex items-center gap-1.5 ${a.done ? "line-through" : ""}`}>
                  {isOverdue(a) && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  {a.name}
                  {a.kind === "exam" && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 font-normal">
                      Exam
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: a.courseColor || "#888" }}
                  />
                  {a.courseName}
                </p>
              </Link>
            </div>
            <div className="flex items-center gap-2 pl-7 sm:pl-0">
              {a.dueDate && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(a.dueDate)}
                </span>
              )}
              <DaysLeftBadge daysLeft={a.daysLeft} />
              <Badge variant="secondary" className="text-xs">
                {a.done ? "Done" : "Pending"}
              </Badge>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No deadlines across your courses" : "No deadlines match filters"}
          </p>
        )}
      </div>
    </div>
  );
}
