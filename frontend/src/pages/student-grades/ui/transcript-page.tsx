"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

import { gradeQueries } from "@/entities/grade";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { GradeColumn, SemesterTable, score, summaryLine } from "./grades-table";
import { StudentCard } from "./student-card";

function getColumns(t: ReturnType<typeof useTranslations<"pages.studentGrades.transcript">>): GradeColumn[] {
  return [
    { header: t("columns.credits"), cell: (c) => c.credits },
    { header: t("columns.ects"), cell: (c) => c.ects ?? "" },
    { header: t("columns.score"), cell: (c) => score(c.total) },
    { header: t("columns.letter"), cell: (c) => c.letter ?? "" },
    { header: t("columns.gpa"), cell: (c) => score(c.grade_points) },
    { header: t("columns.traditional"), cell: (c) => c.traditional ?? "" },
  ];
}

/** Without studentId: the signed-in student's own transcript. With it: an admin viewing a student. */
export function TranscriptPage({ studentId }: { studentId?: number }) {
  const t = useTranslations("pages.studentGrades.transcript");
  const tGradesTable = useTranslations("pages.studentGrades.gradesTable");
  const grades = useQuery(gradeQueries.of(studentId));
  const columns = useMemo(() => getColumns(t), [t]);
  return (
    <>
      <PageHeader
        title={t("title")}
        crumbs={studentId ? [{ label: t("crumbStudents"), href: "/admin/students" }, { label: t("crumbTranscript") }] : undefined}
        actions={
          <div className="flex gap-2 print:hidden">
            {studentId && (
              <Button asChild variant="ghost">
                <Link href={`/admin/students/${studentId}/attestation`}>{t("attestation")}</Link>
              </Button>
            )}
            {/* ponytail: browser print-to-PDF; a server-rendered PDF only if an official signed copy is needed. */}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden /> {t("print")}
            </Button>
          </div>
        }
      />
      <StudentCard studentId={studentId} />
      <QueryState query={grades}>
        {(data) =>
          data.semesters.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty")} />
          ) : (
            <div className="space-y-4">
              {data.semesters.map((semester) => (
                <SemesterTable key={semester.semester_id} semester={semester} columns={columns} summary />
              ))}
              <p className="text-sm font-semibold">{summaryLine(tGradesTable, data.summary)}</p>
            </div>
          )
        }
      </QueryState>
    </>
  );
}
