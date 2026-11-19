"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { GradeInput, GradeSheetRow, gradeQueries } from "@/entities/grade";
import { useApiErrorMessage } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { saveGrades } from "../api/save-grades";

const FIELDS = [
  { key: "attestation_1", max: 30 },
  { key: "attestation_2", max: 30 },
  { key: "final_exam", max: 40 },
] as const;
type Field = (typeof FIELDS)[number]["key"];
type Draft = Record<number, Partial<Record<Field, string>>>;

/** Must match ADMISSION_MIN on the server: attestations 1 + 2 needed to sit the final exam. */
export const ADMISSION_MIN = 30;

/** Empty clears the mark; anything else must be a number within 0..max. */
function parse(value: string, max: number): number | null | undefined {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number * 100) / 100 : undefined;
}

export function GradeSheet({ sectionId }: { sectionId: number }) {
  const t = useTranslations("features.editGrades");
  const tCommon = useTranslations("common");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const sheet = useQuery(gradeQueries.sheet(sectionId));
  const [draft, setDraft] = useState<Draft>({});

  const fieldLabels: Record<Field, string> = {
    attestation_1: t("fields.attestation1"),
    attestation_2: t("fields.attestation2"),
    final_exam: t("fields.finalExam"),
  };

  const mutation = useMutation({
    mutationFn: (rows: GradeInput[]) => saveGrades(sectionId, rows),
    onSuccess: (data) => {
      queryClient.setQueryData(gradeQueries.sheet(sectionId).queryKey, data);
      setDraft({});
      toast.success(t("toast.saved"));
    },
    onError: (error) => toast.error(getMessage(error, { NOT_ADMITTED: t("errors.notAdmitted", { min: ADMISSION_MIN }) })),
  });

  const valueOf = (row: GradeSheetRow, key: Field) => draft[row.registration_id]?.[key] ?? row[key]?.toString() ?? "";
  const admittedNow = (row: GradeSheetRow) => (Number(valueOf(row, "attestation_1")) || 0) + (Number(valueOf(row, "attestation_2")) || 0) >= ADMISSION_MIN;

  const submit = (rows: GradeSheetRow[]) => {
    const payload: GradeInput[] = [];
    for (const row of rows.filter((r) => draft[r.registration_id])) {
      const item: GradeInput = { registration_id: row.registration_id };
      for (const { key, max } of FIELDS) {
        const parsed = parse(valueOf(row, key), max);
        if (parsed === undefined) return toast.error(t("validation.markRange", { name: row.full_name, field: fieldLabels[key], max }));
        item[key] = parsed;
      }
      if (item.final_exam != null && !admittedNow(row)) return toast.error(t("validation.notAdmitted", { name: row.full_name }));
      payload.push(item);
    }
    mutation.mutate(payload);
  };

  return (
    <QueryState query={sheet}>
      {({ rows, closed, editable }) =>
        rows.length === 0 ? (
          <EmptyState icon={Users} title={t("emptyTitle")} />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(rows);
            }}
            className="space-y-3"
          >
            {closed && (
              <p className="bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                <Lock className="size-4" aria-hidden />
                {editable ? t("closedBanner.adminEditable") : t("closedBanner.locked")}
              </p>
            )}
            <Table>
              <caption className="sr-only">{t("table.caption")}</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.id")}</TableHead>
                  <TableHead>{t("table.student")}</TableHead>
                  {FIELDS.map((f) => (
                    <TableHead key={f.key} className="w-32">
                      {fieldLabels[f.key]} <span className="text-muted-foreground">/ {f.max}</span>
                    </TableHead>
                  ))}
                  <TableHead>{t("table.total")}</TableHead>
                  <TableHead>{t("table.grade")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const admitted = admittedNow(row);
                  return (
                    <TableRow key={row.registration_id}>
                      <TableCell className="tabular-nums">{row.student_number}</TableCell>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      {FIELDS.map(({ key, max }) => {
                        const blocked = key === "final_exam" && !admitted;
                        return (
                          <TableCell key={key}>
                            {blocked && !valueOf(row, key) ? (
                              <Badge variant="secondary" title={t("notAdmittedTitle", { min: ADMISSION_MIN })}>
                                {t("notAdmittedBadge")}
                              </Badge>
                            ) : (
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={max}
                                step={0.01}
                                disabled={!editable}
                                aria-invalid={blocked || undefined}
                                aria-label={t("fieldAriaLabel", { field: fieldLabels[key], name: row.full_name })}
                                value={valueOf(row, key)}
                                onChange={(event) => setDraft((d) => ({ ...d, [row.registration_id]: { ...d[row.registration_id], [key]: event.target.value } }))}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="tabular-nums">{row.total.toFixed(2)}</TableCell>
                      <TableCell>{row.letter ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {editable && (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={mutation.isPending || Object.keys(draft).length === 0}>
                  {mutation.isPending ? tCommon("saving") : t("saveLabel")}
                </Button>
                {Object.keys(draft).length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setDraft({})}>
                    {t("discardLabel")}
                  </Button>
                )}
                <p className="text-muted-foreground text-sm">{t("helperText", { min: ADMISSION_MIN })}</p>
              </div>
            )}
          </form>
        )
      }
    </QueryState>
  );
}
