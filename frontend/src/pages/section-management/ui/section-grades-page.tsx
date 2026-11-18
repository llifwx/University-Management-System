"use client";

import { useQuery } from "@tanstack/react-query";

import { courseQueries } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { GradeSheet } from "@/features/edit-grades";
import { PageHeader } from "@/shared/ui/page-header";

export function SectionGradesPage({ sectionId }: { sectionId: number }) {
  const section = useQuery(sectionQueries.detail(sectionId));
  const course = useQuery({ ...courseQueries.detail(section.data?.course_id ?? 0), enabled: section.data !== undefined });
  const title = course.data ? `${course.data.course_code} · Section ${section.data?.section_number} · Grades` : "Grades";
  return (
    <>
      <PageHeader title={title} description={section.data?.teacher_name ?? undefined} crumbs={[{ label: "Sections", href: "/admin/sections" }, { label: "Grades" }]} />
      <GradeSheet sectionId={sectionId} />
    </>
  );
}
