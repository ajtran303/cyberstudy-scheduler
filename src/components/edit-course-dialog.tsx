"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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

const COLORS = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

interface EditCourseDialogProps {
  course: {
    id: string;
    name: string;
    courseCode: string | null;
    color: string;
    professorName: string | null;
    professorEmail: string | null;
    website: string | null;
    status: string;
  };
}

export function EditCourseDialog({ course }: EditCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(course.color);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(formData: FormData): Record<string, string> {
    const errs: Record<string, string> = {};
    const name = (formData.get("name") as string)?.trim();
    if (!name) errs.name = "Course name is required";
    else if (name.length > 200) errs.name = "Max 200 characters";

    const email = formData.get("professorEmail") as string;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.professorEmail = "Invalid email address";
    }

    const website = formData.get("website") as string;
    if (website && !/^https?:\/\/.+/.test(website)) {
      errs.website = "Must start with http:// or https://";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldErrors = validate(formData);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/v1/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          courseCode: formData.get("courseCode") || null,
          professorName: formData.get("professorName") || null,
          professorEmail: formData.get("professorEmail") || null,
          website: formData.get("website") || null,
          color: selectedColor,
          status: formData.get("status"),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update course");
        return;
      }

      toast.success("Course updated");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Edit course">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Course Name *</Label>
            <Input id="edit-name" name="name" required defaultValue={course.name} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-courseCode">Course Code</Label>
              <Input
                id="edit-courseCode"
                name="courseCode"
                placeholder="CIST 1001"
                className="font-mono"
                defaultValue={course.courseCode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-1 flex-wrap" role="radiogroup" aria-label="Course color">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selectedColor === c}
                    aria-label={c}
                    onClick={() => setSelectedColor(c)}
                    className={`size-10 rounded-full transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selectedColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <span className="size-6 rounded-full" style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-professorName">Professor</Label>
              <Input
                id="edit-professorName"
                name="professorName"
                defaultValue={course.professorName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                name="status"
                defaultValue={course.status}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-professorEmail">Professor Email</Label>
              <Input
                id="edit-professorEmail"
                name="professorEmail"
                type="email"
                defaultValue={course.professorEmail ?? ""}
                aria-invalid={!!errors.professorEmail}
              />
              {errors.professorEmail && <p className="text-xs text-destructive">{errors.professorEmail}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                name="website"
                type="url"
                defaultValue={course.website ?? ""}
                aria-invalid={!!errors.website}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
