"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TopicDetailsEditorProps {
  topicId: string;
  initialDetails: string | null;
  initialNotes: string | null;
}

export function TopicDetailsEditor({
  topicId,
  initialDetails,
  initialNotes,
}: TopicDetailsEditorProps) {
  const router = useRouter();
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [details, setDetails] = useState(initialDetails ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveField(field: "details" | "notes", value: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? `Failed to save ${field}`);
        return;
      }

      toast.success(field === "details" ? "Details saved" : "Notes saved");
      if (field === "details") setEditingDetails(false);
      else setEditingNotes(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Details */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold">Details</h2>
          {!editingDetails && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => setEditingDetails(true)}
              aria-label="Edit details"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        {editingDetails ? (
          <div className="space-y-2">
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add details..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="min-h-[44px]"
                disabled={saving}
                onClick={() => saveField("details", details)}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                onClick={() => {
                  setDetails(initialDetails ?? "");
                  setEditingDetails(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : details ? (
          <p className="text-sm text-muted-foreground">{details}</p>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDetails(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm px-1"
          >
            + Add details
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold">Notes</h2>
          {!editingNotes && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => setEditingNotes(true)}
              aria-label="Edit notes"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="min-h-[44px]"
                disabled={saving}
                onClick={() => saveField("notes", notes)}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                onClick={() => {
                  setNotes(initialNotes ?? "");
                  setEditingNotes(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : notes ? (
          <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
            {notes}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm px-1"
          >
            + Add notes
          </button>
        )}
      </div>
    </>
  );
}
