"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import Link from "next/link";

import { gradeQueries } from "@/entities/grade";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { GradeColumn, SemesterTable, score } from "./grades-table";
import { StudentCard } from "./student-card";

const COLUMNS: GradeColumn[] = [
  { header: "Attestation 1 / 30", cell: (c) => score(c.attestation_1) },
  { header: "Attestation 2 / 30", cell: (c) => score(c.attestation_2) },
  { header: "Final exam / 40", cell: (c) => (c.admitted || c.final_exam != null ? score(c.final_exam) : <span className="text-muted-foreground">Not admitted</span>) },
  { header: "Letter", cell: (c) => c.letter ?? "" },
];

/** Without studentId: the signed-in student's own attestation. With it: an admin viewing a student. */
export function AttestationPage({ studentId }: { studentId?: number }) {
  const grades = useQuery(gradeQueries.of(studentId));
  return (
    <>
      <PageHeader
        title="Attestation"
        description="Points per course, newest semester first. The final exam needs 30+ attestation points."
        crumbs={studentId ? [{ label: "Students", href: "/admin/students" }, { label: "Attestation" }] : undefined}
        actions={
          studentId && (
            <Button asChild variant="ghost">
              <Link href={`/admin/students/${studentId}/transcript`}>Transcript</Link>
            </Button>
          )
        }
      />
      <StudentCard studentId={studentId} />
      <QueryState query={grades}>
        {(data) =>
          data.semesters.length === 0 ? (
            <EmptyState icon={FileText} title="No courses yet" />
          ) : (
            <div className="space-y-4">
              {[...data.semesters].reverse().map((semester) => (
                <SemesterTable key={semester.semester_id} semester={semester} columns={COLUMNS} />
              ))}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
