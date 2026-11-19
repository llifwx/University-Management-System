"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { scheduleQueries } from "@/entities/schedule";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { WeeklyTimetable, scheduleToEvents } from "@/widgets/weekly-timetable";

export function MySchedulePage() {
  const t = useTranslations("pages.mySchedule");
  const tCourseSection = useTranslations("entities.courseSection");
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const schedule = useQuery({ ...scheduleQueries.me(semesterId ?? 0), enabled: semesterId !== undefined });
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />} />
      {semesters?.length === 0 ? (
        <EmptyState title={t("noSemesters")} />
      ) : (
        <QueryState query={schedule}>{(data) => <WeeklyTimetable events={scheduleToEvents(tCourseSection, data.entries)} emptyMessage={t("emptyMessage")} />}</QueryState>
      )}
    </>
  );
}
