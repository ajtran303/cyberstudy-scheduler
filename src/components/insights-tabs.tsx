"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/calendar-view";
import { StudyStats } from "@/components/study-stats";
import { AnalyticsChart } from "@/components/analytics-chart";
import { StudyStatsChart } from "@/components/study-stats-chart";
import { ReviewForecastChart } from "@/components/review-forecast-chart";

export function InsightsTabs() {
  const [tab, setTab] = useState("calendar");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="w-auto">
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="mt-4">
        <CalendarView />
      </TabsContent>
      <TabsContent value="analytics" className="mt-4 space-y-6">
        <StudyStats />
        <AnalyticsChart />
        <StudyStatsChart />
        <ReviewForecastChart />
      </TabsContent>
    </Tabs>
  );
}
