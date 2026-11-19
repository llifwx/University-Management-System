"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

import { gradeQueries } from "@/entities/grade";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { GradeColumn, SemesterTable, score } from "./grades-table";
import { StudentCard } from "./student-card";

function getColumns(t: ReturnType<typeof useTranslations<"pages.studentGrades.attestation">>): GradeColumn[] {
  return [
    { header: t("columns.attestation1"), cell: (c) => score(c.attestation_1) },
    { header: t("columns.attestation2"), cell: (c) => score(c.attestation_2) },
    { header: t("columns.finalExam"), cell: (c) => (c.admitted || c.final_exam != null ? score(c.final_exam) : <span className="text-muted-foreground">{t("notAdmitted")}</span>) },
    { header: t("columns.letter"), cell: (c) => c.letter ?? "" },
  ];
}

/** Without studentId: the signed-in student's own attestation. With it: an admin viewing a student. */
export function AttestationPage({ studentId }: { studentId?: number }) {
  const t = useTranslations("pages.studentGrades.attestation");
  const grades = useQuery(gradeQueries.of(studentId));
  const columns = useMemo(() => getColumns(t), [t]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        crumbs={studentId ? [{ label: t("crumbStudents"), href: "/admin/students" }, { label: t("crumbAttestation") }] : undefined}
        actions={
          studentId && (
            <Button asChild variant="ghost">
              <Link href={`/admin/students/${studentId}/transcript`}>{t("transcript")}</Link>
            </Button>
          )
        }
      />
      <StudentCard studentId={studentId} />
      <QueryState query={grades}>
        {(data) =>
          data.semesters.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty")} />
          ) : (
            <div className="space-y-4">
              {[...data.semesters].reverse().map((semester) => (
                <SemesterTable key={semester.semester_id} semester={semester} columns={columns} />
              ))}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
