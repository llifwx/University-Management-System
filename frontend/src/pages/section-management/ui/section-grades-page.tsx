"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { courseQueries } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { GradeSheet } from "@/features/edit-grades";
import { PageHeader } from "@/shared/ui/page-header";

export function SectionGradesPage({ sectionId }: { sectionId: number }) {
  const t = useTranslations("pages.sectionManagement.grades");
  const section = useQuery(sectionQueries.detail(sectionId));
  const course = useQuery({ ...courseQueries.detail(section.data?.course_id ?? 0), enabled: section.data !== undefined });
  const title = course.data ? t("titleWithCourse", { code: course.data.course_code, number: section.data?.section_number ?? "" }) : t("titleFallback");
  return (
    <>
      <PageHeader
        title={title}
        description={section.data?.teacher_name ?? undefined}
        crumbs={[{ label: t("breadcrumbs.sections"), href: "/admin/sections" }, { label: t("breadcrumbs.grades") }]}
      />
      <GradeSheet sectionId={sectionId} />
    </>
  );
}
