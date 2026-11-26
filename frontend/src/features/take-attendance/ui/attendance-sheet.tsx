"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { ATTENDANCE_STATUSES, AttendanceStatus, attendanceQueries, saveAttendance } from "@/entities/attendance";
import { useApiErrorMessage } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-600 text-white border-emerald-600",
  LATE: "bg-amber-500 text-white border-amber-500",
  ABSENT: "bg-red-600 text-white border-red-600",
};

/** Unsaved choices per registration; a row without one shows its saved status. */
type Draft = Record<number, AttendanceStatus>;

export function AttendanceSheet({ meetingId, date, editable }: { meetingId: number; date: string; editable: boolean }) {
  const t = useTranslations("features.takeAttendance");
  const tStatus = useTranslations("entities.attendance.status");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const sheet = useQuery(attendanceQueries.sheet(meetingId, date));
  const [draft, setDraft] = useState<Draft>({});

  const mutation = useMutation({
    mutationFn: () => saveAttendance(meetingId, date, Object.entries(draft).map(([id, status]) => ({ registration_id: Number(id), status }))),
    onSuccess: async (data) => {
      queryClient.setQueryData(attendanceQueries.sheet(meetingId, date).queryKey, data);
      setDraft({});
      toast.success(t("toast.saved"));
      // The class list shows "marked x / y" for this date.
      await queryClient.invalidateQueries({ queryKey: attendanceQueries.classes(date).queryKey, exact: true });
    },
    onError: (error) => toast.error(getMessage(error, { CLASS_IN_FUTURE: t("errors.future") })),
  });

  return (
    <QueryState query={sheet}>
      {({ rows }) => {
        if (rows.length === 0) return <EmptyState icon={Users} title={t("empty")} />;
        const statusOf = (row: (typeof rows)[number]) => draft[row.registration_id] ?? row.status;
        const unmarked = rows.filter((row) => !statusOf(row));
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">{t("progress", { marked: rows.length - unmarked.length, total: rows.length })}</p>
              {editable && unmarked.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, ...Object.fromEntries(unmarked.map((row) => [row.registration_id, "PRESENT"])) }))}
                >
                  <CheckCheck aria-hidden />
                  {t("markRestPresent")}
                </Button>
              )}
            </div>
            <Table>
              <caption className="sr-only">{t("caption")}</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("columns.id")}</TableHead>
                  <TableHead>{t("columns.student")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const current = statusOf(row);
                  return (
                    <TableRow key={row.registration_id}>
                      <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell className="tabular-nums">{row.student_number}</TableCell>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell>
                        <div role="radiogroup" aria-label={t("statusAriaLabel", { name: row.full_name })} className="inline-flex gap-1">
                          {ATTENDANCE_STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              role="radio"
                              aria-checked={current === status}
                              disabled={!editable}
                              onClick={() => setDraft((d) => ({ ...d, [row.registration_id]: status }))}
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                current === status ? STATUS_STYLE[status] : "hover:bg-muted",
                              )}
                            >
                              {tStatus(status)}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {editable && (
              <div className="flex justify-end">
                <Button disabled={mutation.isPending || Object.keys(draft).length === 0} onClick={() => mutation.mutate()}>
                  {mutation.isPending ? t("saving") : t("save")}
                </Button>
              </div>
            )}
          </div>
        );
      }}
    </QueryState>
  );
}
