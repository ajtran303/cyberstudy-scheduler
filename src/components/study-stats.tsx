"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  studyMinutesToday: number;
  weeklyAvgMinutes: number;
  reviewsToday: number;
}

export function StudyStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/today-plan");
      const json = await res.json();
      setStats(json.data?.stats ?? null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: "Study today", value: `${stats.studyMinutesToday}m` },
    { label: "Daily avg (7d)", value: `${stats.weeklyAvgMinutes}m` },
    { label: "Reviews today", value: String(stats.reviewsToday) },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
