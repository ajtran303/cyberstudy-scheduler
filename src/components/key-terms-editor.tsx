"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    setTerms(terms.filter((_, i) => i !== index));
  }

  function updateTerm(index: number, field: "term" | "definition", value: string) {
    const updated = [...terms];
    updated[index] = { ...updated[index], [field]: value };
    setTerms(updated);
  }

  async function save() {
    setSaving(true);
    const validTerms = terms.filter((t) => t.term.trim() && t.definition.trim());
    await fetch(`/api/v1/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyTerms: validTerms.length > 0 ? validTerms : null }),
    });
    setSaving(false);
    router.refresh();
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
          <Input
            placeholder="Definition"
            value={term.definition}
            onChange={(e) => updateTerm(i, "definition", e.target.value)}
            className="flex-[2]"
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
