"use client";

import { useCallback, useState } from "react";
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

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

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
        <div key={i} className="flex flex-col gap-1 relative">
          <Input
            placeholder="Term"
            value={term.term}
            onChange={(e) => updateTerm(i, "term", e.target.value)}
            className="font-mono"
          />
          <Textarea
            placeholder="Definition"
            value={term.definition}
            ref={autoResize}
            onChange={(e) => {
              updateTerm(i, "definition", e.target.value);
              autoResize(e.target);
            }}
            className="min-h-[36px] overflow-hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeTerm(i)}
            className="text-destructive absolute top-0 right-0 min-h-[44px] min-w-[44px]"
            aria-label={`Remove term: ${term.term || "empty"}`}
          >
            &times;
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={addTerm}>
          + Add Term
        </Button>
        <Button size="sm" className="min-h-[44px]" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Terms"}
        </Button>
      </div>
    </div>
  );
}
