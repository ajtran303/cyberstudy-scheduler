"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ForecastBucket {
  date: string;
  count: number;
}

export function ReviewForecastChart() {
  const [data, setData] = useState<ForecastBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/v1/review/forecast");
      const json = await res.json();
      setData(json.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-56" />
        <div className="h-48 sm:h-64 flex items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const totalReviews = data.reduce((sum, d) => sum + d.count, 0);

  if (totalReviews === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No upcoming reviews
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Study topics to schedule SRS reviews.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Review forecast — next 14 days ({totalReviews} review{totalReviews === 1 ? "" : "s"})
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00");
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
                fontSize: 12,
              }}
              labelFormatter={(label: string) => {
                const d = new Date(label + "T00:00:00");
                return d.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              }}
              formatter={(value: number) => [`${value} topic${value === 1 ? "" : "s"}`, "Due"]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
