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

const COLORS = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

export function CreateCourseDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
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
      const res = await fetch("/api/v1/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          courseCode: formData.get("courseCode") || undefined,
          professorName: formData.get("professorName") || undefined,
          professorEmail: formData.get("professorEmail") || undefined,
          website: formData.get("website") || undefined,
          color: selectedColor,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to create course");
        return;
      }

      toast.success("Course created");
      setOpen(false);
      setErrors({});
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input id="name" name="name" required aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input id="courseCode" name="courseCode" placeholder="CIST 1001" className="font-mono" />
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
          <div className="space-y-2">
            <Label htmlFor="professorName">Professor</Label>
            <Input id="professorName" name="professorName" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="professorEmail">Professor Email</Label>
              <Input id="professorEmail" name="professorEmail" type="email" aria-invalid={!!errors.professorEmail} />
              {errors.professorEmail && <p className="text-xs text-destructive">{errors.professorEmail}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" aria-invalid={!!errors.website} />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Course"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
