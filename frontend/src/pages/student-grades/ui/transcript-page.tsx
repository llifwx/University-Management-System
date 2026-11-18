"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import Link from "next/link";

import { gradeQueries } from "@/entities/grade";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { GradeColumn, SemesterTable, score, summaryLine } from "./grades-table";
import { StudentCard } from "./student-card";

const COLUMNS: GradeColumn[] = [
  { header: "Credits", cell: (c) => c.credits },
  { header: "ECTS", cell: (c) => c.ects ?? "" },
  { header: "Score", cell: (c) => score(c.total) },
  { header: "Letter", cell: (c) => c.letter ?? "" },
  { header: "GPA", cell: (c) => score(c.grade_points) },
  { header: "Traditional", cell: (c) => c.traditional ?? "" },
];

/** Without studentId: the signed-in student's own transcript. With it: an admin viewing a student. */
export function TranscriptPage({ studentId }: { studentId?: number }) {
  const grades = useQuery(gradeQueries.of(studentId));
  return (
    <>
      <PageHeader
        title="Transcript"
        crumbs={studentId ? [{ label: "Students", href: "/admin/students" }, { label: "Transcript" }] : undefined}
        actions={
          <div className="flex gap-2 print:hidden">
            {studentId && (
              <Button asChild variant="ghost">
                <Link href={`/admin/students/${studentId}/attestation`}>Attestation</Link>
              </Button>
            )}
            {/* ponytail: browser print-to-PDF; a server-rendered PDF only if an official signed copy is needed. */}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden /> Print / PDF
            </Button>
          </div>
        }
      />
      <StudentCard studentId={studentId} />
      <QueryState query={grades}>
        {(data) =>
          data.semesters.length === 0 ? (
            <EmptyState icon={FileText} title="No courses yet" />
          ) : (
            <div className="space-y-4">
              {data.semesters.map((semester) => (
                <SemesterTable key={semester.semester_id} semester={semester} columns={COLUMNS} summary />
              ))}
              <p className="text-sm font-semibold">{summaryLine(data.summary)}</p>
            </div>
          )
        }
      </QueryState>
    </>
  );
}
