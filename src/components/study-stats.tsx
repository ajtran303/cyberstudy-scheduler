"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const items = [
    { label: "Study Time Today", value: `${stats.studyMinutesToday}m` },
    { label: "7-Day Average", value: `${stats.weeklyAvgMinutes}m` },
    { label: "Reviews Completed", value: String(stats.reviewsToday) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
