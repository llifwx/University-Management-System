"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns/locale";
import { CalendarRange, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Semester, semesterQueries } from "@/entities/semester";
import { DeleteSemesterButton, SemesterActiveSwitch, SemesterFormDialog } from "@/features/manage-semester";
import { useDateFnsLocale } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

function buildColumns(t: (key: string) => string, dateLocale: DateFnsLocale | undefined): Column<Semester>[] {
  const formatDate = (date: string) => format(parseISO(date), "MMM d, yyyy", { locale: dateLocale });
  return [
    { header: t("columns.name"), cell: (semester) => <span className="font-medium">{semester.name}</span> },
    { header: t("columns.starts"), cell: (semester) => formatDate(semester.start_date) },
    { header: t("columns.ends"), cell: (semester) => formatDate(semester.end_date) },
    { header: t("columns.openForRegistration"), cell: (semester) => <SemesterActiveSwitch semester={semester} /> },
    {
      header: t("columns.actions"),
      cell: (semester) => (
        <div className="flex justify-end gap-1 md:justify-start">
          <SemesterFormDialog
            semester={semester}
            trigger={
              <Button variant="ghost" size="sm">
                {t("edit")}
              </Button>
            }
          />
          <DeleteSemesterButton semester={semester} />
        </div>
      ),
    },
  ];
}

export function SemesterManagementPage() {
  const t = useTranslations("pages.semesterManagement");
  const dateLocale = useDateFnsLocale();
  const semesters = useQuery(semesterQueries.list());
  const columns = useMemo(() => buildColumns(t, dateLocale), [t, dateLocale]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <SemesterFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                {t("addSemester")}
              </Button>
            }
          />
        }
      />
      <QueryState query={semesters}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={CalendarRange} title={t("empty.title")} />
          ) : (
            <DataTable caption={t("table.caption")} columns={columns} rows={rows} rowKey={(semester) => semester.semester_id} />
          )
        }
      </QueryState>
    </>
  );
}
