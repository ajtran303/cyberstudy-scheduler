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

interface CourseInfo {
  courseId: string;
  name: string;
  color: string;
  totalMinutes: number;
  sessionCount: number;
}

interface StatsData {
  totalMinutes: number;
  sessionCount: number;
  averageMinutes: number;
  byCourse: CourseInfo[];
  byDay: Array<Record<string, string | number>>;
}

export function StudyStatsChart() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/v1/study-sessions/stats");
      const json = await res.json();
      setData(json.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading study stats...
      </p>
    );
  }

  if (!data || data.sessionCount === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No study sessions yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Start a timer or log a session to see your study stats here.
        </p>
      </div>
    );
  }

  const hours = Math.floor(data.totalMinutes / 60);
  const mins = data.totalMinutes % 60;

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium">
            {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Sessions: </span>
          <span className="font-medium">{data.sessionCount}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Avg: </span>
          <span className="font-medium">{data.averageMinutes}m</span>
        </div>
      </div>

      {data.byCourse.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {data.byCourse.map((c) => (
            <div key={c.courseId} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.byDay}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00");
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={32}
              tickFormatter={(v: number) => `${v}m`}
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
              formatter={(value: number, name: string) => {
                const course = data.byCourse.find((c) => c.courseId === name);
                return [`${value}m`, course?.name ?? "Study"];
              }}
            />
            {data.byCourse.map((c) => (
              <Bar
                key={c.courseId}
                dataKey={c.courseId}
                stackId="a"
                fill={c.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
