"use client";

import { useQuery } from "@tanstack/react-query";

import { scheduleQueries } from "@/entities/schedule";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { WeeklyTimetable, scheduleToEvents } from "@/widgets/weekly-timetable";

export function MySchedulePage() {
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const schedule = useQuery({ ...scheduleQueries.me(semesterId ?? 0), enabled: semesterId !== undefined });
  return (
    <>
      <PageHeader title="Weekly schedule" description="Times are shown in campus-local time." actions={<SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />} />
      {semesters?.length === 0 ? (
        <EmptyState title="No semesters yet" />
      ) : (
        <QueryState query={schedule}>{(data) => <WeeklyTimetable events={scheduleToEvents(data.entries)} emptyMessage="You are not enrolled in any class this semester." />}</QueryState>
      )}
    </>
  );
}
