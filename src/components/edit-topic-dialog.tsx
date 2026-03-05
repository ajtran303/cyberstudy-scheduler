"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EditTopicDialogProps {
  topicId: string;
  name: string;
  date: string | null;
  children: React.ReactNode;
}

export function EditTopicDialog({ topicId, name, date, children }: EditTopicDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nameVal = (formData.get("name") as string)?.trim();

    const errs: Record<string, string> = {};
    if (!nameVal) errs.name = "Topic name is required";
    else if (nameVal.length > 200) errs.name = "Max 200 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    try {
      const body: Record<string, unknown> = { name: nameVal };
      const dateVal = formData.get("date") as string;
      body.date = dateVal || null;

      const res = await fetch(`/api/v1/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message ?? "Failed to update topic");
        return;
      }

      toast.success("Topic updated");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  // Extract YYYY-MM-DD from UTC components (safe for noon-UTC dates)
  const dateDefault = date ? new Date(date).toISOString().split("T")[0] : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-topic-name">Name *</Label>
            <Input id="edit-topic-name" name="name" required defaultValue={name} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-topic-date">Date</Label>
            <Input id="edit-topic-date" name="date" type="date" defaultValue={dateDefault} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
