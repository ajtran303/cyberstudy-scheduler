"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DaysLeftBadge } from "@/components/days-left-badge";
import { formatDate } from "@/lib/utils";

interface Course {
  id: string;
  name: string;
  color: string | null;
}

interface Assignment {
  id: string;
  name: string;
  dueDate: string | null;
  status: "PENDING" | "DONE";
  description: string | null;
  daysLeft: string;
}

interface MergedAssignment extends Assignment {
  courseId: string;
  courseName: string;
  courseColor: string | null;
}

export function AllAssignments() {
  const router = useRouter();
  const [items, setItems] = useState<MergedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/courses");
        const json = await res.json();
        const courses: Course[] = json.data || [];

        const results = await Promise.all(
          courses.map(async (c) => {
            const r = await fetch(`/api/v1/courses/${c.id}/assignments`);
            const j = await r.json();
            return ((j.data || []) as Assignment[]).map((a) => ({
              ...a,
              courseId: c.id,
              courseName: c.name,
              courseColor: c.color,
            }));
          })
        );

        setItems(results.flat());
      } catch {
        // silently fail — empty list
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayed = items
    .filter((a) => !hideDone || a.status !== "DONE")
    .sort((a, b) => {
      // Overdue PENDING items first
      const aOverdue = a.daysLeft === "late" && a.status === "PENDING" ? 0 : 1;
      const bOverdue = b.daysLeft === "late" && b.status === "PENDING" ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      // Then by due date, nulls last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const doneCount = items.filter((a) => a.status === "DONE").length;

  function isOverdue(a: MergedAssignment) {
    return a.daysLeft === "late" && a.status === "PENDING";
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "PENDING" ? "DONE" : "PENDING";
    const oldItems = [...items];

    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus as "PENDING" | "DONE" } : a))
    );

    try {
      const res = await fetch(`/api/v1/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setItems(oldItems);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update assignment");
        return;
      }

      router.refresh();
      toast.success(`Marked as ${newStatus === "DONE" ? "done" : "pending"}`, {
        action: {
          label: "Undo",
          onClick: () => toggleStatus(id, newStatus),
        },
      });
    } catch {
      setItems(oldItems);
      toast.error("Network error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
            key={a.id}
            className={`flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
              a.status === "DONE"
                ? "opacity-50"
                : isOverdue(a)
                ? "bg-destructive/5 border border-destructive/20 hover:bg-destructive/10"
                : "hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => toggleStatus(a.id, a.status)}
                className="flex items-center justify-center size-11 shrink-0 -m-3.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                aria-label={a.status === "DONE" ? `Mark ${a.name} as pending` : `Mark ${a.name} as done`}
              >
                <span
                  className={`h-4 w-4 rounded border transition-colors ${
                    a.status === "DONE"
                      ? "bg-primary border-primary"
                      : "border-muted-foreground hover:border-primary"
                  }`}
                />
              </button>
              <Link href={`/dashboard/courses/${a.courseId}`} className="min-w-0 flex-1">
                <p className={`text-sm font-medium flex items-center gap-1.5 ${a.status === "DONE" ? "line-through" : ""}`}>
                  {isOverdue(a) && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  {a.name}
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
                {a.status === "DONE" ? "Done" : "Pending"}
              </Badge>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No assignments across your courses" : "No assignments match filters"}
          </p>
        )}
      </div>
    </div>
  );
}
