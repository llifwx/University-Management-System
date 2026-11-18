"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";

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

export function TranscriptPage() {
  const grades = useQuery(gradeQueries.mine());
  return (
    <>
      <PageHeader
        title="Transcript"
        actions={
          // ponytail: browser print-to-PDF; a server-rendered PDF only if an official signed copy is needed.
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer aria-hidden /> Print / PDF
          </Button>
        }
      />
      <StudentCard />
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
