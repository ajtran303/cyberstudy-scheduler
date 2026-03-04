"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/utils";

interface AnalyticsData {
  total: number;
  distribution: Record<string, number>;
  percentages: Record<string, number>;
}

const LEVELS = ["EXPOSED", "SCANNING", "HARDENED", "CLASSIFIED"] as const;

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
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading analytics...</p>;
  }

  if (!data || data.total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No topics to analyze</p>;
  }

  const chartData = LEVELS.map((level) => ({
    name: MASTERY_LABELS[level],
    value: data.distribution[level],
    color: MASTERY_COLORS[level],
    percentage: data.percentages[level],
  })).filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {data.total} topics total
        </h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} topics`, name]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
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
    </div>
  );
}
