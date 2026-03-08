"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  total: number;
  distribution: Record<string, number>;
  percentages: Record<string, number>;
}

const LEVELS = ["NOT_STARTED", "LEARNING", "PROFICIENT", "MASTERED"] as const;

export function AnalyticsChart({ courseId }: { courseId?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = courseId ? `?courseId=${courseId}` : "";
      const res = await fetch(`/api/v1/analytics${params}`);
      const json = await res.json();
      setData(json.data);
      setLoading(false);
    }
    load();
  }, [courseId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mastery Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Skeleton className="h-44 w-44 sm:h-48 sm:w-48 rounded-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mastery Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">No topics to analyze</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a course and add topics to see your mastery distribution here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = LEVELS.map((level) => ({
    name: MASTERY_LABELS[level],
    value: data.distribution[level],
    color: MASTERY_COLORS[level],
    percentage: data.percentages[level],
  })).filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mastery Distribution</CardTitle>
        <CardDescription>{data.total} topics total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="h-44 w-44 sm:h-48 sm:w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={75}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {LEVELS.map((level) => (
              <div key={level} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: MASTERY_COLORS[level] }}
                />
                <span className="text-sm w-24">{MASTERY_LABELS[level]}</span>
                <span className="text-sm font-mono w-8 text-right">
                  {data.distribution[level]}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({data.percentages[level]}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
