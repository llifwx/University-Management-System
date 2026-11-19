"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { courseQueries } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";
import { TimetableEvent, WeeklyTimetable } from "@/widgets/weekly-timetable";

export function TeacherSchedulePage() {
  const t = useTranslations("pages.teacherDashboard.schedule");
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const assigned = useQuery({ ...sectionQueries.assigned(semesterId), enabled: semesterId !== undefined });
  const courses = useQuery(courseQueries.list());
  const events = useMemo<TimetableEvent[]>(() => {
    const courseById = new Map(courses.data?.map((c) => [c.course_id, c]));
    return (assigned.data ?? []).flatMap((section) =>
      section.meetings.map((meeting) => ({
        id: String(meeting.id),
        sectionId: section.section_id,
        day: meeting.meeting_day,
        start: meeting.start_time,
        end: meeting.end_time,
        code: courseById.get(section.course_id)?.course_code ?? t("sectionFallback", { id: section.section_id }),
        title: courseById.get(section.course_id)?.course_title ?? "",
        section: section.section_number,
      })),
    );
  }, [assigned.data, courses.data, t]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />} />
      <QueryState query={assigned}>{() => <WeeklyTimetable events={events} emptyMessage={t("timetableEmpty")} />}</QueryState>
    </>
  );
}
