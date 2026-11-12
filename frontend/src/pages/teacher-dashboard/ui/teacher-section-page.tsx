"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { courseQueries } from "@/entities/course";
import { MeetingList, RosterStudent, sectionQueries } from "@/entities/course-section";
import { Card, CardContent } from "@/shared/ui/card";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

// The API also returns student emails, but a roster does not need contact details on screen.
const columns: Column<RosterStudent>[] = [
  { header: "Student", cell: (student) => <span className="font-medium">{student.full_name}</span> },
  { header: "Program", cell: (student) => student.program ?? "Not set" },
  { header: "Year", cell: (student) => student.year_level },
];

export function TeacherSectionPage({ sectionId }: { sectionId: number }) {
  const section = useQuery(sectionQueries.detail(sectionId));
  const roster = useQuery(sectionQueries.roster(sectionId));
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
      <h2 className="mb-3 font-semibold">Enrolled students</h2>
      <QueryState query={roster}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={Users} title="No students enrolled yet" />
          ) : (
            <DataTable caption="Enrolled students" columns={columns} rows={rows} rowKey={(student) => student.student_id} />
          )
        }
      </QueryState>
    </>
  );
}
