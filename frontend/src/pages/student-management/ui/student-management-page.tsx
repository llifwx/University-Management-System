"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { DeactivateStudentButton, ReactivateStudentButton, StudentFormDialog } from "@/features/manage-student";
import { useClientPagination } from "@/shared/lib/use-client-pagination";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Column, DataTable, PaginationControls } from "@/shared/ui/data-table";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

function StudentDetails({ student, active }: { student: Student; active: boolean | undefined }) {
  const t = useTranslations("pages.studentManagement");
  const rows: [string, string | number][] = [
    [t("fields.email"), student.email],
    [t("fields.program"), student.program ?? t("notSet")],
    [t("fields.yearLevel"), student.year_level],
    [t("fields.account"), active === undefined ? "…" : active ? t("active") : t("inactive")],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StudentManagementPage() {
  const t = useTranslations("pages.studentManagement");
  const [term, setTerm] = useState("");
  const students = useQuery(studentQueries.list());
  const users = useQuery(userQueries.list());
  // StudentOut has no active flag; the linked user row carries it.
  const activeByUser = useMemo(() => new Map(users.data?.map((u) => [u.id, u.is_active])), [users.data]);
  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const all = students.data ?? [];
    if (!needle) return all;
    return all.filter((s) => s.full_name.toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle));
  }, [students.data, term]);
  const pagination = useClientPagination(filtered);

  const columns: Column<Student>[] = [
    { header: t("columns.name"), cell: (student) => <span className="font-medium">{student.full_name}</span> },
    { header: t("columns.email"), cell: (student) => <span className="break-all">{student.email}</span> },
    { header: t("columns.program"), cell: (student) => student.program ?? t("notSet") },
    { header: t("columns.year"), cell: (student) => student.year_level },
    {
      header: t("columns.account"),
      cell: (student) => {
        const active = activeByUser.get(student.user_id);
        if (active === undefined) return "…";
        return <Badge variant={active ? "default" : "secondary"}>{active ? t("active") : t("inactive")}</Badge>;
      },
    },
    {
      header: t("columns.actions"),
      cell: (student) => (
        <div className="flex flex-wrap justify-end gap-1 md:justify-start">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/students/${student.student_id}/transcript`}>{t("grades")}</Link>
          </Button>
          <FormDialog
            trigger={
              <Button variant="ghost" size="sm">
                {t("details")}
              </Button>
            }
            title={student.full_name}
          >
            {() => <StudentDetails student={student} active={activeByUser.get(student.user_id)} />}
          </FormDialog>
          <StudentFormDialog
            student={student}
            trigger={
              <Button variant="ghost" size="sm">
                {t("edit")}
              </Button>
            }
          />
          {activeByUser.get(student.user_id) === false ? <ReactivateStudentButton student={student} /> : <DeactivateStudentButton student={student} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <StudentFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                {t("addStudent")}
              </Button>
            }
          />
        }
      />
      <div className="mb-4 max-w-sm space-y-1.5">
        <Label htmlFor="student-search">{t("search")}</Label>
        <Input id="student-search" type="search" placeholder={t("searchPlaceholder")} value={term} onChange={(event) => setTerm(event.target.value)} />
      </div>
      <QueryState query={students}>
        {() =>
          filtered.length === 0 ? (
            <EmptyState icon={Users} title={t("empty")} />
          ) : (
            <>
              <DataTable caption={t("caption")} columns={columns} rows={pagination.pageItems} rowKey={(student) => student.student_id} />
              <PaginationControls page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} onPageChange={pagination.setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
