"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarRange, Plus } from "lucide-react";

import { Semester, semesterQueries } from "@/entities/semester";
import { DeleteSemesterButton, SemesterActiveSwitch, SemesterFormDialog } from "@/features/manage-semester";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

const formatDate = (date: string) => format(parseISO(date), "MMM d, yyyy");

const columns: Column<Semester>[] = [
  { header: "Name", cell: (semester) => <span className="font-medium">{semester.name}</span> },
  { header: "Starts", cell: (semester) => formatDate(semester.start_date) },
  { header: "Ends", cell: (semester) => formatDate(semester.end_date) },
  { header: "Open for registration", cell: (semester) => <SemesterActiveSwitch semester={semester} /> },
  {
    header: "Actions",
    cell: (semester) => (
      <div className="flex justify-end gap-1 md:justify-start">
        <SemesterFormDialog
          semester={semester}
          trigger={
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          }
        />
        <DeleteSemesterButton semester={semester} />
      </div>
    ),
  },
];

export function SemesterManagementPage() {
  const semesters = useQuery(semesterQueries.list());
  return (
    <>
      <PageHeader
        title="Semesters"
        description="Academic terms. Registration is only accepted in terms that are open."
        actions={
          <SemesterFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                Add semester
              </Button>
            }
          />
        }
      />
      <QueryState query={semesters}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={CalendarRange} title="No semesters yet" />
          ) : (
            <DataTable caption="Semesters" columns={columns} rows={rows} rowKey={(semester) => semester.semester_id} />
          )
        }
      </QueryState>
    </>
  );
}
