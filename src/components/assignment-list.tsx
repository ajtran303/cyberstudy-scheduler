"use client";

import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Assignment {
  id: string;
  name: string;
  dueDate: string | null;
  status: "PENDING" | "DONE";
  description: string | null;
  daysLeft: string;
}

export function AssignmentList({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments`);
    const json = await res.json();
    setAssignments(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  function confirmToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "PENDING" ? "Done" : "Pending";
    toast(`Mark assignment as ${newStatus}?`, {
      action: {
        label: "Confirm",
        onClick: () => doToggleStatus(id, currentStatus),
      },
      duration: 5000,
    });
  }

  async function doToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "PENDING" ? "DONE" : "PENDING";
    const oldAssignments = [...assignments];

    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    try {
      const res = await fetch(`/api/v1/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setAssignments(oldAssignments);
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update assignment");
        return;
      }

      router.refresh();
      toast.success(`Marked as ${newStatus === "DONE" ? "done" : "pending"}`, {
        action: {
          label: "Undo",
          onClick: () => doToggleStatus(id, newStatus),
        },
      });
    } catch {
      setAssignments(oldAssignments);
      toast.error("Network error");
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          dueDate: formData.get("dueDate") || undefined,
          description: formData.get("description") || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to create assignment");
        return;
      }

      toast.success("Assignment created");
      setOpen(false);
      load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(a: Assignment) {
    setEditAssignment(a);
    setEditErrors({});
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editAssignment) return;

    const formData = new FormData(e.currentTarget);
    const nameVal = (formData.get("name") as string)?.trim();

    const errs: Record<string, string> = {};
    if (!nameVal) errs.name = "Name is required";
    else if (nameVal.length > 200) errs.name = "Max 200 characters";
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditSaving(true);

    try {
      const res = await fetch(`/api/v1/assignments/${editAssignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameVal,
          dueDate: formData.get("dueDate") || null,
          description: formData.get("description") || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update assignment");
        return;
      }

      toast.success("Assignment updated");
      setEditOpen(false);
      load();
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/assignments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to delete assignment");
        return;
      }

      toast.success("Assignment deleted");
      load();
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32 rounded-md" />
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
          {assignments.length} assignments
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ New Assignment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="a-name">Name *</Label>
                <Input id="a-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-due">Due Date</Label>
                <Input id="a-due" name="dueDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-desc">Description</Label>
                <Textarea id="a-desc" name="description" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Assignment"}
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
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          {editAssignment && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ea-name">Name *</Label>
                <Input id="ea-name" name="name" required defaultValue={editAssignment.name} key={editAssignment.id} aria-invalid={!!editErrors.name} />
                {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ea-due">Due Date</Label>
                <Input id="ea-due" name="dueDate" type="date" defaultValue={editAssignment.dueDate ? new Date(editAssignment.dueDate).toISOString().split("T")[0] : ""} key={`date-${editAssignment.id}`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ea-desc">Description</Label>
                <Textarea id="ea-desc" name="description" rows={3} defaultValue={editAssignment.description ?? ""} key={`desc-${editAssignment.id}`} />
              </div>
              <Button type="submit" className="w-full" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-1">
        {assignments.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
              a.status === "DONE" ? "opacity-50" : "hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => confirmToggleStatus(a.id, a.status)}
                className={`h-4 w-4 rounded border shrink-0 transition-colors ${
                  a.status === "DONE"
                    ? "bg-primary border-primary"
                    : "border-muted-foreground hover:border-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${a.status === "DONE" ? "line-through" : ""}`}>
                  {a.name}
                </p>
                {a.description && (
                  <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                )}
              </div>
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete assignment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{a.name}</strong>. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(a.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {assignments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No assignments yet</p>
        )}
      </div>
    </div>
  );
}
