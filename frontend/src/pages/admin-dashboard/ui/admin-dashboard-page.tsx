"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarRange, ClipboardList, Layers, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { courseQueries } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { REGISTRATION_STATUSES, registrationQueries } from "@/entities/registration";
import { pickCurrentSemester, semesterQueries } from "@/entities/semester";
import { studentQueries } from "@/entities/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatCard } from "@/shared/ui/stat-card";
import { QueryState } from "@/shared/ui/states";

import type { ChartRow } from "./stat-bar-chart";

const StatBarChart = dynamic(() => import("./stat-bar-chart"), { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> });

function ChartCard({ title, rows, unit, children }: { title: string; rows: ChartRow[] | undefined; unit?: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        {/* The same numbers for screen readers, which cannot read the SVG. */}
        {rows && (
          <table className="sr-only">
            <caption>{title}</caption>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>
                    {row.value}
                    {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const students = useQuery(studentQueries.total());
  const courses = useQuery(courseQueries.total());
  const sections = useQuery(sectionQueries.list());
  const registrations = useQuery(registrationQueries.list());
  const semesters = useQuery(semesterQueries.list());
  const current = semesters.data && pickCurrentSemester(semesters.data.filter((s) => s.is_active));

  const byStatus = useMemo<ChartRow[] | undefined>(
    () => registrations.data && REGISTRATION_STATUSES.map((status) => ({ label: status, value: registrations.data.filter((r) => r.status === status).length })),
    [registrations.data],
  );
  const seatFill = useMemo<ChartRow[] | undefined>(() => {
    if (!sections.data || !semesters.data) return undefined;
    return semesters.data.map((semester) => {
      const own = sections.data.filter((s) => s.semester_id === semester.semester_id);
      const capacity = own.reduce((sum, s) => sum + s.capacity, 0);
      const enrolled = own.reduce((sum, s) => sum + s.enrolled_count, 0);
      return { label: semester.name, value: capacity ? Math.round((enrolled / capacity) * 100) : 0 };
    });
  }, [sections.data, semesters.data]);

  return (
    <>
      <PageHeader title="Administration" description="University-wide totals." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Students" value={students.data} icon={Users} />
        <StatCard label="Courses" value={courses.data} icon={BookOpen} />
        <StatCard label="Sections" value={sections.data?.length} icon={Layers} />
        <StatCard label="Registrations" value={registrations.data?.length} icon={ClipboardList} />
        <StatCard label="Active semester" value={semesters.data ? (current?.name ?? "None") : undefined} icon={CalendarRange} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Registrations by status" rows={byStatus}>
          <QueryState query={registrations}>{() => <StatBarChart data={byStatus ?? []} />}</QueryState>
        </ChartCard>
        <ChartCard title="Seats filled by semester" rows={seatFill} unit="%">
          <QueryState query={sections}>{() => <StatBarChart data={seatFill ?? []} unit="%" />}</QueryState>
        </ChartCard>
      </div>
    </>
  );
}
