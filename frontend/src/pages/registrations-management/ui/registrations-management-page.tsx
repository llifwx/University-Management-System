"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { courseQueries } from "@/entities/course";
import { Section, sectionQueries } from "@/entities/course-section";
import { REGISTRATION_STATUSES, Registration, RegistrationStatusBadge, registrationQueries } from "@/entities/registration";
import { semesterQueries } from "@/entities/semester";
import { studentQueries } from "@/entities/student";
import { EnrollStudentDialog, RegistrationActions } from "@/features/manage-registration";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { useClientPagination } from "@/shared/lib/use-client-pagination";
import { Button } from "@/shared/ui/button";
import { Column, DataTable, PaginationControls } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function RegistrationsManagementPage() {
  const { semesters, semesterId, setSemesterId } = useSemesterParam({ defaultToAll: true });
  const [sectionId, setSectionId] = useState<number | undefined>();
  const [status, setStatus] = useState("");
  const [studentTerm, setStudentTerm] = useState("");

  const registrations = useQuery(registrationQueries.list({ semester_id: semesterId, section_id: sectionId }));
  const students = useQuery(studentQueries.list());
  const sections = useQuery(sectionQueries.list());
  const courses = useQuery(courseQueries.list());
  const allSemesters = useQuery(semesterQueries.list());

  const studentById = useMemo(() => new Map(students.data?.map((s) => [s.student_id, s])), [students.data]);
  const sectionById = useMemo(() => new Map(sections.data?.map((s) => [s.section_id, s])), [sections.data]);
  const courseById = useMemo(() => new Map(courses.data?.map((c) => [c.course_id, c])), [courses.data]);
  const semesterById = useMemo(() => new Map(allSemesters.data?.map((s) => [s.semester_id, s])), [allSemesters.data]);

  const sectionLabel = (section: Section) => {
    const semester = semesterById.get(section.semester_id)?.name ?? "";
    return `${courseById.get(section.course_id)?.course_code ?? section.course_id} · ${section.section_number} · ${semester}`;
  };

  // The API filters by semester and section only; status and student are narrowed here.
  const filtered = useMemo(() => {
    const needle = studentTerm.trim().toLowerCase();
    return (registrations.data ?? []).filter((row) => {
      if (status && row.status !== status) return false;
      if (!needle) return true;
      const student = studentById.get(row.student_id);
      return student?.full_name.toLowerCase().includes(needle) || student?.email.toLowerCase().includes(needle);
    });
  }, [registrations.data, status, studentTerm, studentById]);
  const pagination = useClientPagination(filtered);

  const columns: Column<Registration>[] = [
    { header: "Student", cell: (row) => <span className="font-medium">{studentById.get(row.student_id)?.full_name ?? `#${row.student_id}`}</span> },
    {
      header: "Section",
      cell: (row) => {
        const section = sectionById.get(row.section_id);
        return section ? `${courseById.get(section.course_id)?.course_code ?? ""} · ${section.section_number}` : "…";
      },
    },
    { header: "Semester", cell: (row) => semesterById.get(row.semester_id)?.name ?? "…" },
    { header: "Registered", cell: (row) => format(new Date(row.registered_at), "MMM d, yyyy") },
    { header: "Status", cell: (row) => <RegistrationStatusBadge status={row.status} /> },
    { header: "Actions", cell: (row) => <RegistrationActions registration={row} /> },
  ];

  const sectionOptions = (sections.data ?? []).filter((s) => semesterId === undefined || s.semester_id === semesterId);

  return (
    <>
      <PageHeader
        title="Registrations"
        description="Every enrollment record across the university."
        actions={
          students.data &&
          sections.data && (
            <EnrollStudentDialog
              options={{ students: students.data, sections: sections.data, sectionLabel }}
              trigger={
                <Button>
                  <Plus aria-hidden />
                  Enroll student
                </Button>
              }
            />
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SemesterSelect
          semesters={semesters}
          value={semesterId}
          onChange={(id) => {
            setSectionId(undefined);
            setSemesterId(id);
          }}
          allowAll
        />
        <div className="space-y-1.5">
          <Label htmlFor="section-filter">Section</Label>
          <NativeSelect id="section-filter" className="sm:w-56" value={sectionId ?? ""} onChange={(event) => setSectionId(event.target.value ? Number(event.target.value) : undefined)}>
            <option value="">All sections</option>
            {sectionOptions.map((section) => (
              <option key={section.section_id} value={section.section_id}>
                {sectionLabel(section)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration-status">Status</Label>
          <NativeSelect id="registration-status" className="sm:w-40" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {REGISTRATION_STATUSES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 flex-1 basis-56 space-y-1.5">
          <Label htmlFor="registration-student">Student</Label>
          <Input id="registration-student" type="search" placeholder="Name, email or student ID" value={studentTerm} onChange={(event) => setStudentTerm(event.target.value)} />
        </div>
      </div>
      <QueryState query={registrations}>
        {() =>
          filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No registrations found" />
          ) : (
            <>
              <DataTable caption="Registrations" columns={columns} rows={pagination.pageItems} rowKey={(row) => row.registration_id} />
              <PaginationControls page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} onPageChange={pagination.setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
