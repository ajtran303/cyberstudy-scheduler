"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DaysLeftBadge } from "@/components/days-left-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  async function load() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments`);
    const json = await res.json();
    setAssignments(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "PENDING" ? "DONE" : "PENDING";
    try {
      const res = await fetch(`/api/v1/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update assignment");
        return;
      }

      load();
      router.refresh();
    } catch {
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

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

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
                <Input id="a-desc" name="description" />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Assignment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                onClick={() => toggleStatus(a.id, a.status)}
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
                  {new Date(a.dueDate).toLocaleDateString()}
                </span>
              )}
              <DaysLeftBadge daysLeft={a.daysLeft} />
              <Badge variant="secondary" className="text-xs">
                {a.status === "DONE" ? "Done" : "Pending"}
              </Badge>
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
