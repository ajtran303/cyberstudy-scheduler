"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface KeyTerm {
  term: string;
  definition: string;
}

interface KeyTermsEditorProps {
  topicId: string;
  initialTerms: KeyTerm[];
}

export function KeyTermsEditor({ topicId, initialTerms }: KeyTermsEditorProps) {
  const router = useRouter();
  const [terms, setTerms] = useState<KeyTerm[]>(initialTerms);
  const [saving, setSaving] = useState(false);

  function addTerm() {
    setTerms([...terms, { term: "", definition: "" }]);
  }

  function removeTerm(index: number) {
    const removed = terms[index];
    const updated = terms.filter((_, i) => i !== index);
    setTerms(updated);
    toast("Term removed", {
      action: {
        label: "Undo",
        onClick: () => {
          setTerms((current) => {
            const restored = [...current];
            restored.splice(index, 0, removed);
            return restored;
          });
        },
      },
    });
  }

  function updateTerm(index: number, field: "term" | "definition", value: string) {
    const updated = [...terms];
    updated[index] = { ...updated[index], [field]: value };
    setTerms(updated);
  }

  async function save() {
    setSaving(true);
    const validTerms = terms.filter((t) => t.term.trim() && t.definition.trim());

    try {
      const res = await fetch(`/api/v1/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyTerms: validTerms.length > 0 ? validTerms : null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to save terms");
        return;
      }

      toast.success("Terms saved");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {terms.map((term, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Term"
            value={term.term}
            onChange={(e) => updateTerm(i, "term", e.target.value)}
            className="font-mono flex-1"
          />
          <Textarea
            placeholder="Definition"
            value={term.definition}
            onChange={(e) => updateTerm(i, "definition", e.target.value)}
            className="flex-[2] min-h-9 resize-none"
            rows={1}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeTerm(i)}
            className="text-destructive shrink-0"
          >
            x
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addTerm}>
          + Add Term
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Terms"}
        </Button>
      </div>
    </div>
  );
}
