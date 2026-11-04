"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Plus } from "lucide-react";
import { useMemo } from "react";

import { courseQueries } from "@/entities/course";
import { MeetingList, Section, sectionQueries } from "@/entities/course-section";
import { semesterQueries } from "@/entities/semester";
import { userQueries } from "@/entities/user";
import { DeleteSectionButton, SectionFormDialog, SectionFormOptions } from "@/features/manage-section";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { useClientPagination } from "@/shared/lib/use-client-pagination";
import { Button } from "@/shared/ui/button";
import { Column, DataTable, PaginationControls } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function SectionManagementPage() {
  const { semesters, semesterId, setSemesterId } = useSemesterParam({ defaultToAll: true });
  const sections = useQuery(sectionQueries.list({ semester_id: semesterId }));
  const courses = useQuery(courseQueries.list());
  const allSemesters = useQuery(semesterQueries.list());
  const users = useQuery(userQueries.list());

  const courseById = useMemo(() => new Map(courses.data?.map((c) => [c.course_id, c])), [courses.data]);
  const semesterById = useMemo(() => new Map(allSemesters.data?.map((s) => [s.semester_id, s])), [allSemesters.data]);
  const userById = useMemo(() => new Map(users.data?.map((u) => [u.id, u])), [users.data]);
  const options: SectionFormOptions | undefined = useMemo(
    () =>
      courses.data && allSemesters.data && users.data
        ? { courses: courses.data, semesters: allSemesters.data, teachers: users.data.filter((u) => u.role === "TEACHER" && u.is_active) }
        : undefined,
    [courses.data, allSemesters.data, users.data],
  );
  const rows = sections.data ?? [];
  const pagination = useClientPagination(rows);

  const columns: Column<Section>[] = [
    {
      header: "Course",
      cell: (section) => {
        const course = courseById.get(section.course_id);
        return <span className="font-medium">{course ? `${course.course_code} · ${course.course_title}` : "…"}</span>;
      },
    },
    { header: "Section", cell: (section) => section.section_number },
    { header: "Semester", cell: (section) => semesterById.get(section.semester_id)?.name ?? "…" },
    { header: "Teacher", cell: (section) => (section.teacher_id === null ? "Unassigned" : <span className="break-all">{userById.get(section.teacher_id)?.email ?? "…"}</span>) },
    { header: "Meetings", cell: (section) => <MeetingList meetings={section.meetings} /> },
    { header: "Seats", className: "tabular-nums", cell: (section) => `${section.enrolled_count} / ${section.capacity}` },
    {
      header: "Actions",
      cell: (section) => (
        <div className="flex justify-end gap-1 md:justify-start">
          {options && (
            <SectionFormDialog
              section={section}
              options={options}
              trigger={
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              }
            />
          )}
          <DeleteSectionButton section={section} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sections"
        description="Offerings of a course in a semester, with teacher, capacity and weekly meetings."
        actions={
          options && (
            <SectionFormDialog
              options={options}
              trigger={
                <Button>
                  <Plus aria-hidden />
                  Add section
                </Button>
              }
            />
          )
        }
      />
      <div className="mb-4">
        <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} allowAll />
      </div>
      <QueryState query={sections}>
        {() =>
          rows.length === 0 ? (
            <EmptyState icon={Layers} title="No sections found" />
          ) : (
            <>
              <DataTable caption="Course sections" columns={columns} rows={pagination.pageItems} rowKey={(section) => section.section_id} />
              <PaginationControls page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} onPageChange={pagination.setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
