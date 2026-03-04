"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  id: string;
  name: string;
  courseCode?: string | null;
  professorName?: string | null;
  status: string;
  color: string;
  _count?: { topics: number; assignments: number; exams: number };
}

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export function CourseCard({ id, name, courseCode, professorName, status, color, _count }: CourseCardProps) {
  return (
    <Link href={`/dashboard/courses/${id}`}>
      <Card className="cyber-glow transition-all hover:scale-[1.02] cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <CardTitle className="text-base leading-tight">{name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {statusLabels[status] || status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {courseCode && (
            <p className="text-xs font-mono text-muted-foreground mb-1">
              {courseCode}
            </p>
          )}
          {professorName && (
            <p className="text-xs text-muted-foreground mb-2">
              {professorName}
            </p>
          )}
          {_count && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{_count.topics} topics</span>
              <span>{_count.assignments} assignments</span>
              <span>{_count.exams} exams</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
