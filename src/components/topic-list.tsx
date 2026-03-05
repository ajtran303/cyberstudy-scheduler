"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MasteryBadge } from "@/components/mastery-badge";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Topic {
  id: string;
  name: string;
  date: string | null;
  details: string | null;
  mastery: "EXPOSED" | "SCANNING" | "HARDENED" | "CLASSIFIED";
  lastReviewedAt: string | null;
}

interface TopicListProps {
  courseId: string;
  topics: Topic[];
}

export function TopicList({ courseId, topics }: TopicListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          date: formData.get("date") || undefined,
          details: formData.get("details") || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to create topic");
        return;
      }

      toast.success("Topic created");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {topics.length} topics
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ New Topic</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Topic</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-name">Name *</Label>
                <Input id="topic-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-date">Date</Label>
                <Input id="topic-date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-details">Details</Label>
                <Input id="topic-details" name="details" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Topic"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/dashboard/topics/${topic.id}`}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{topic.name}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {topic.date && (
                  <span>{formatDate(topic.date)}</span>
                )}
                {topic.details && (
                  <span className="truncate">{topic.details}</span>
                )}
              </div>
            </div>
            <MasteryBadge mastery={topic.mastery} size="sm" />
          </Link>
        ))}
        {topics.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No topics yet
          </p>
        )}
      </div>
    </div>
  );
}
