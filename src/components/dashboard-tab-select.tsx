"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TAB_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "review", label: "Review" },
  { value: "flashcards", label: "Flashcards" },
  { value: "courses", label: "Courses" },
  { value: "assignments", label: "Assignments" },
  { value: "insights", label: "Insights" },
] as const;

interface DashboardTabSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function DashboardTabSelect({ value, onValueChange }: DashboardTabSelectProps) {
  return (
    <div className="sm:hidden">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TAB_OPTIONS.map((tab) => (
            <SelectItem key={tab.value} value={tab.value}>
              {tab.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
