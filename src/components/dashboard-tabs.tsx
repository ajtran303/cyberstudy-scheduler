"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardTabSelect } from "@/components/dashboard-tab-select";

interface DashboardTabsProps {
  children: Record<string, React.ReactNode>;
}

export function DashboardTabs({ children }: DashboardTabsProps) {
  const [tab, setTab] = useState("today");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <DashboardTabSelect value={tab} onValueChange={setTab} />
      <div className="hidden sm:flex flex-col gap-1 sm:flex-row sm:gap-2">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="today" className="flex-1 sm:flex-initial">Today</TabsTrigger>
          <TabsTrigger value="review" className="flex-1 sm:flex-initial">Review</TabsTrigger>
          <TabsTrigger value="flashcards" className="flex-1 sm:flex-initial">Flashcards</TabsTrigger>
        </TabsList>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="courses" className="flex-1 sm:flex-initial">Courses</TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 sm:flex-initial">Assignments</TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 sm:flex-initial">Insights</TabsTrigger>
        </TabsList>
      </div>

      {Object.entries(children).map(([key, content]) => (
        <TabsContent key={key} value={key} className={"mt-4"}>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
