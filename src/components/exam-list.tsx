"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DaysLeftBadge } from "@/components/days-left-badge";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Exam {
  id: string;
  name: string;
  date: string | null;
  status: "UPCOMING" | "COMPLETED";
  description: string | null;
  daysLeft: string;
}

export function ExamList({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch(`/api/v1/courses/${courseId}/exams`);
    const json = await res.json();
    setExams(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  function confirmToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "UPCOMING" ? "Completed" : "Upcoming";
    toast(`Mark exam as ${newStatus}?`, {
      action: {
        label: "Confirm",
        onClick: () => doToggleStatus(id, currentStatus),
      },
      duration: 5000,
    });
  }

  async function doToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "UPCOMING" ? "COMPLETED" : "UPCOMING";
    const oldExams = [...exams];

    // Optimistic update
    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );

    try {
      const res = await fetch(`/api/v1/exams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setExams(oldExams);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update exam");
        return;
      }

      router.refresh();
      toast.success(`Marked as ${newStatus === "COMPLETED" ? "completed" : "upcoming"}`, {
        action: {
          label: "Undo",
          onClick: () => doToggleStatus(id, newStatus),
        },
      });
    } catch {
      setExams(oldExams);
      toast.error("Network error");
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          date: formData.get("date") || undefined,
          description: formData.get("description") || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to create exam");
        return;
      }

      toast.success("Exam created");
      setOpen(false);
      load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(exam: Exam) {
    setEditExam(exam);
    setEditErrors({});
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editExam) return;

    const formData = new FormData(e.currentTarget);
    const nameVal = (formData.get("name") as string)?.trim();

    const errs: Record<string, string> = {};
    if (!nameVal) errs.name = "Name is required";
    else if (nameVal.length > 200) errs.name = "Max 200 characters";
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditSaving(true);

    try {
      const res = await fetch(`/api/v1/exams/${editExam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameVal,
          date: formData.get("date") || null,
          description: formData.get("description") || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update exam");
        return;
      }

      toast.success("Exam updated");
      setEditOpen(false);
      load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setEditSaving(false);
    }
  }

  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleDelete(id: string) {
    const deleted = exams.find((e) => e.id === id);
    if (!deleted) return;

    setExams((prev) => prev.filter((e) => e.id !== id));

    if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current);

    toast("Exam deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(pendingDeleteRef.current);
          setExams((prev) =>
            [...prev, deleted].sort((a, b) => {
              if (!a.date) return 1;
              if (!b.date) return -1;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            })
          );
        },
      },
      duration: 5000,
    });

    pendingDeleteRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/exams/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          toast.error(body?.error?.message ?? "Failed to delete exam");
          setExams((prev) => [...prev, deleted]);
        } else {
          router.refresh();
        }
      } catch {
        toast.error("Network error");
        setExams((prev) => [...prev, deleted]);
      }
    }, 5000);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {exams.length} exams
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="min-h-[44px]">+ New Exam</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Exam</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e-name">Name *</Label>
                <Input id="e-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-date">Date</Label>
                <Input id="e-date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-desc">Description</Label>
                <Textarea id="e-desc" name="description" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Exam"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {/* TODO: On mobile Firefox, the edit dialog may dismiss immediately after opening due to a ghost pointer event. Investigate Radix Dialog + programmatic open timing. */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          {editExam && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ee-name">Name *</Label>
                <Input id="ee-name" name="name" required defaultValue={editExam.name} key={editExam.id} aria-invalid={!!editErrors.name} />
                {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ee-date">Date</Label>
                <Input id="ee-date" name="date" type="date" defaultValue={editExam.date ? new Date(editExam.date).toISOString().split("T")[0] : ""} key={`date-${editExam.id}`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ee-desc">Description</Label>
                <Textarea id="ee-desc" name="description" rows={3} defaultValue={editExam.description ?? ""} key={`desc-${editExam.id}`} />
              </div>
              <Button type="submit" className="w-full" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-1">
        {exams.map((e) => (
          <div
            key={e.id}
            className={`flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
              e.status === "COMPLETED" ? "opacity-50" : "hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => confirmToggleStatus(e.id, e.status)}
                className="flex items-center justify-center size-11 shrink-0 -m-3.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                aria-label={e.status === "COMPLETED" ? `Mark ${e.name} as upcoming` : `Mark ${e.name} as completed`}
              >
                <span
                  className={`h-4 w-4 rounded border transition-colors ${
                    e.status === "COMPLETED"
                      ? "bg-primary border-primary"
                      : "border-muted-foreground hover:border-primary"
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${e.status === "COMPLETED" ? "line-through" : ""}`}>
                  {e.name}
                </p>
                {e.description && (
                  <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-7 sm:pl-0">
              {e.date && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(e.date)}
                </span>
              )}
              <DaysLeftBadge daysLeft={e.daysLeft} />
              <Badge variant="secondary" className="text-xs">
                {e.status === "COMPLETED" ? "Completed" : "Upcoming"}
              </Badge>
              <Button variant="ghost" size="icon" className="size-11" onClick={() => openEdit(e)} aria-label="Edit exam">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-11 text-destructive hover:text-destructive" aria-label="Delete exam" onClick={() => handleDelete(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {exams.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No exams yet</p>
        )}
      </div>
    </div>
  );
}
