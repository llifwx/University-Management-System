"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

import { courseQueries } from "@/entities/course";
import { MeetingList, Section, sectionQueries } from "@/entities/course-section";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function TeacherDashboardPage() {
  const t = useTranslations("pages.teacherDashboard.dashboard");
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const assigned = useQuery(sectionQueries.assigned(semesterId));
  const courses = useQuery(courseQueries.list());
  const courseById = useMemo(() => new Map(courses.data?.map((c) => [c.course_id, c])), [courses.data]);
  const data = assigned.data;

  const columns: Column<Section>[] = [
    {
      header: t("columns.course"),
      cell: (section) => {
        const course = courseById.get(section.course_id);
        return (
          <Link href={`/teacher/sections/${section.section_id}`} className="font-medium hover:underline">
            {course ? `${course.course_code} · ${course.course_title}` : t("sectionFallback", { id: section.section_id })}
          </Link>
        );
      },
    },
    { header: t("columns.section"), cell: (section) => section.section_number },
    { header: t("columns.weeklyMeetings"), cell: (section) => <MeetingList meetings={section.meetings} /> },
    { header: t("columns.enrolled"), className: "tabular-nums", cell: (section) => `${section.enrolled_count} / ${section.capacity}` },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} allowAll />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("stats.assignedSections")} value={data?.length} icon={Layers} />
        <StatCard label={t("stats.enrolledStudents")} value={data?.reduce((sum, s) => sum + s.enrolled_count, 0)} icon={Users} />
        <StatCard label={t("stats.courses")} value={data && new Set(data.map((s) => s.course_id)).size} icon={BookOpen} />
      </div>
      <QueryState query={assigned}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={Layers} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <DataTable caption={t("table.caption")} columns={columns} rows={rows} rowKey={(section) => section.section_id} />
          )
        }
      </QueryState>
    </>
  );
}
