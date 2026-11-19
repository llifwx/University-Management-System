"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { courseQueries } from "@/entities/course";
import { MeetingList, sectionQueries } from "@/entities/course-section";
import { GradeSheet } from "@/features/edit-grades";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

export function TeacherSectionPage({ sectionId }: { sectionId: number }) {
  const t = useTranslations("pages.teacherDashboard.section");
  const section = useQuery(sectionQueries.detail(sectionId));
  const course = useQuery({ ...courseQueries.detail(section.data?.course_id ?? 0), enabled: section.data !== undefined });
  const title = course.data ? t("titleWithCourse", { code: course.data.course_code, number: section.data?.section_number ?? "" }) : t("titleFallback");

  return (
    <>
      <PageHeader title={title} description={course.data?.course_title} crumbs={[{ label: t("breadcrumbs.dashboard"), href: "/teacher" }, { label: t("breadcrumbs.section") }]} />
      <QueryState query={section}>
        {(data) => (
          <Card className="mb-6 shadow-sm">
            <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1">{t("weeklyMeetings")}</p>
                <MeetingList meetings={data.meetings} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{t("enrollment")}</p>
                <p className="tabular-nums">
                  {t("enrollmentSummary", { enrolled: data.enrolled_count, remaining: data.remaining_capacity, capacity: data.capacity })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>
      <h2 className="mb-3 font-semibold">{t("studentsAndGrades")}</h2>
      <GradeSheet sectionId={sectionId} />
    </>
  );
}
