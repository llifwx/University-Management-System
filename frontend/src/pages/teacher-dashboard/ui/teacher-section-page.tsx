"use client";

import { useQuery } from "@tanstack/react-query";

import { courseQueries } from "@/entities/course";
import { MeetingList, sectionQueries } from "@/entities/course-section";
import { GradeSheet } from "@/features/edit-grades";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

export function TeacherSectionPage({ sectionId }: { sectionId: number }) {
  const section = useQuery(sectionQueries.detail(sectionId));
  const course = useQuery({ ...courseQueries.detail(section.data?.course_id ?? 0), enabled: section.data !== undefined });
  const title = course.data ? `${course.data.course_code} · Section ${section.data?.section_number}` : "Section details";

  return (
    <>
      <PageHeader title={title} description={course.data?.course_title} crumbs={[{ label: "Teaching dashboard", href: "/teacher" }, { label: "Section" }]} />
      <QueryState query={section}>
        {(data) => (
          <Card className="mb-6 shadow-sm">
            <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1">Weekly meetings</p>
                <MeetingList meetings={data.meetings} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Enrollment</p>
                <p className="tabular-nums">
                  {data.enrolled_count} enrolled · {data.remaining_capacity} of {data.capacity} seats remaining
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>
      <h2 className="mb-3 font-semibold">Students and grades</h2>
      <GradeSheet sectionId={sectionId} />
    </>
  );
}
