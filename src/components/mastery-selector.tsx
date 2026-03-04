"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";

const MASTERY_LEVELS = ["EXPOSED", "SCANNING", "HARDENED", "CLASSIFIED"] as const;

interface MasterySelectorProps {
  topicId: string;
  currentMastery: string;
}

export function MasterySelector({ topicId, currentMastery }: MasterySelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateMastery(mastery: string) {
    if (mastery === currentMastery) return;

    setLoading(mastery);
    try {
      const res = await fetch(`/api/v1/topics/${topicId}/mastery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastery }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to update mastery");
        return;
      }

      toast.success("Mastery updated");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MASTERY_LEVELS.map((level) => {
        const color = MASTERY_COLORS[level];
        const isActive = currentMastery === level;

        return (
          <Button
            key={level}
            variant="outline"
            size="sm"
            disabled={loading !== null}
            onClick={() => updateMastery(level)}
            className={`transition-all ${isActive ? "ring-2" : "opacity-60 hover:opacity-100"}`}
            style={{
              borderColor: color,
              color: isActive ? "white" : color,
              backgroundColor: isActive ? color : "transparent",
              ...(isActive ? { ringColor: color } : {}),
            }}
          >
            {loading === level ? "..." : MASTERY_LABELS[level]}
          </Button>
        );
      })}
    </div>
  );
}
