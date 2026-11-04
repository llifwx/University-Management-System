"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { courseQueries } from "@/entities/course";
import { MeetingList, sectionQueries } from "@/entities/course-section";
import { REGISTRATION_STATUSES, Registration, RegistrationStatusBadge, registrationQueries } from "@/entities/registration";
import { CancelRegistrationButton } from "@/features/cancel-registration";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function EnrollmentTable() {
  const [status, setStatus] = useState("");
  const { semesters, semesterId, setSemesterId } = useSemesterParam({ defaultToAll: true });
  const registrations = useQuery(registrationQueries.mine(semesterId));
  const sections = useQuery(sectionQueries.list());
  const courses = useQuery(courseQueries.list());

  const sectionById = useMemo(() => new Map(sections.data?.map((s) => [s.section_id, s])), [sections.data]);
  const courseById = useMemo(() => new Map(courses.data?.map((c) => [c.course_id, c])), [courses.data]);
  const semesterById = useMemo(() => new Map(semesters?.map((s) => [s.semester_id, s])), [semesters]);

  const courseOf = (row: Registration) => {
    const section = sectionById.get(row.section_id);
    return section && courseById.get(section.course_id);
  };

  const columns: Column<Registration>[] = [
    {
      header: "Course",
      cell: (row) => {
        const course = courseOf(row);
        return course ? (
          <Link href={`/courses/${course.course_id}`} className="hover:underline">
            <span className="font-medium">{course.course_code}</span> · {course.course_title}
          </Link>
        ) : (
          "…"
        );
      },
    },
    { header: "Section", cell: (row) => sectionById.get(row.section_id)?.section_number ?? "…" },
    { header: "Semester", cell: (row) => semesterById.get(row.semester_id)?.name ?? "…" },
    { header: "Weekly meetings", cell: (row) => <MeetingList meetings={sectionById.get(row.section_id)?.meetings ?? []} /> },
    { header: "Status", cell: (row) => <RegistrationStatusBadge status={row.status} /> },
    { header: "Registered", cell: (row) => format(new Date(row.registered_at), "MMM d, yyyy") },
    {
      header: "Actions",
      cell: (row) =>
        row.status === "Enrolled" || row.status === "Pending" ? (
          <CancelRegistrationButton registrationId={row.registration_id} courseLabel={courseOf(row)?.course_code ?? "this section"} />
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} allowAll />
        <div className="space-y-1.5">
          <Label htmlFor="status-filter">Status</Label>
          <NativeSelect id="status-filter" className="sm:w-40" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {REGISTRATION_STATUSES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <QueryState query={registrations}>
        {(data) => {
          const rows = status ? data.filter((row) => row.status === status) : data;
          if (rows.length === 0) {
            return (
              <EmptyState
                icon={ClipboardList}
                title="No registrations found"
                description="Browse the catalog to register for a section."
                action={
                  <Button asChild size="sm" className="mt-2">
                    <Link href="/courses">Open catalog</Link>
                  </Button>
                }
              />
            );
          }
          return <DataTable caption="Your course registrations" columns={columns} rows={rows} rowKey={(row) => row.registration_id} />;
        }}
      </QueryState>
    </div>
  );
}
