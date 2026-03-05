"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
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
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        <div className="flex justify-center">
          <Skeleton className="size-40 rounded-full" />
        </div>
      </div>
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

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        {/* Donut chart */}
        <div className="h-44 w-44 sm:h-48 sm:w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.byCourse}
                dataKey="totalMinutes"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={75}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {data.byCourse.map((c) => (
                  <Cell key={c.courseId} fill={c.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with stats */}
        <div className="space-y-2">
          {data.byCourse.map((c) => (
            <div key={c.courseId} className="flex items-start gap-2">
              <div
                className="h-3 w-3 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: c.color }}
              />
              <div className="text-sm">
                <span className="font-medium">{c.name}</span>
                <br className="sm:hidden" />
                <span className="text-muted-foreground">
                  {" "}&mdash; {formatMinutes(c.totalMinutes)} / {c.sessionCount} {c.sessionCount === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
