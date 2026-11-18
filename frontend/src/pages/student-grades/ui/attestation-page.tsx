"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { gradeQueries } from "@/entities/grade";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { GradeColumn, SemesterTable, score } from "./grades-table";
import { StudentCard } from "./student-card";

const COLUMNS: GradeColumn[] = [
  { header: "Attestation 1 / 30", cell: (c) => score(c.attestation_1) },
  { header: "Attestation 2 / 30", cell: (c) => score(c.attestation_2) },
  { header: "Final exam / 40", cell: (c) => score(c.final_exam) },
  { header: "Letter", cell: (c) => c.letter ?? "" },
];

export function AttestationPage() {
  const grades = useQuery(gradeQueries.mine());
  return (
    <>
      <PageHeader title="Attestation" description="Points per course, newest semester first." />
      <StudentCard />
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
