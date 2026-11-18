"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GradeInput, GradeSheetRow, gradeQueries } from "@/entities/grade";
import { getErrorMessage } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { saveGrades } from "../api/save-grades";

const FIELDS = [
  { key: "attestation_1", label: "Attestation 1", max: 30 },
  { key: "attestation_2", label: "Attestation 2", max: 30 },
  { key: "final_exam", label: "Final exam", max: 40 },
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

const MESSAGES = {
  GRADING_CLOSED: "The semester has ended; ask an administrator to change grades.",
  NOT_ADMITTED: `A final exam mark needs at least ${ADMISSION_MIN} attestation points.`,
};

export function GradeSheet({ sectionId }: { sectionId: number }) {
  const queryClient = useQueryClient();
  const sheet = useQuery(gradeQueries.sheet(sectionId));
  const [draft, setDraft] = useState<Draft>({});

  const mutation = useMutation({
    mutationFn: (rows: GradeInput[]) => saveGrades(sectionId, rows),
    onSuccess: (data) => {
      queryClient.setQueryData(gradeQueries.sheet(sectionId).queryKey, data);
      setDraft({});
      toast.success("Grades saved.");
    },
    onError: (error) => toast.error(getErrorMessage(error, MESSAGES)),
  });

  const valueOf = (row: GradeSheetRow, key: Field) => draft[row.registration_id]?.[key] ?? row[key]?.toString() ?? "";
  const admittedNow = (row: GradeSheetRow) => (Number(valueOf(row, "attestation_1")) || 0) + (Number(valueOf(row, "attestation_2")) || 0) >= ADMISSION_MIN;

  const submit = (rows: GradeSheetRow[]) => {
    const payload: GradeInput[] = [];
    for (const row of rows.filter((r) => draft[r.registration_id])) {
      const item: GradeInput = { registration_id: row.registration_id };
      for (const { key, label, max } of FIELDS) {
        const parsed = parse(valueOf(row, key), max);
        if (parsed === undefined) return toast.error(`${row.full_name}: ${label} must be between 0 and ${max}.`);
        item[key] = parsed;
      }
      if (item.final_exam != null && !admittedNow(row)) return toast.error(`${row.full_name} is not admitted to the final exam.`);
      payload.push(item);
    }
    mutation.mutate(payload);
  };

  return (
    <QueryState query={sheet}>
      {({ rows, closed, editable }) =>
        rows.length === 0 ? (
          <EmptyState icon={Users} title="No students enrolled yet" />
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
                {editable
                  ? "The semester has ended. Teachers can no longer change these grades; as an administrator you still can."
                  : "The semester has ended, so grades are locked. Ask an administrator for corrections."}
              </p>
            )}
            <Table>
              <caption className="sr-only">Grade sheet</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Student</TableHead>
                  {FIELDS.map((f) => (
                    <TableHead key={f.key} className="w-32">
                      {f.label} <span className="text-muted-foreground">/ {f.max}</span>
                    </TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const admitted = admittedNow(row);
                  return (
                    <TableRow key={row.registration_id}>
                      <TableCell className="tabular-nums">{row.student_number}</TableCell>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      {FIELDS.map(({ key, label, max }) => {
                        const blocked = key === "final_exam" && !admitted;
                        return (
                          <TableCell key={key}>
                            {blocked && !valueOf(row, key) ? (
                              <Badge variant="secondary" title={`Attestations total below ${ADMISSION_MIN}`}>
                                Not admitted
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
                                aria-label={`${label} for ${row.full_name}`}
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
                  {mutation.isPending ? "Saving…" : "Save grades"}
                </Button>
                {Object.keys(draft).length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setDraft({})}>
                    Discard changes
                  </Button>
                )}
                <p className="text-muted-foreground text-sm">
                  The final exam opens at {ADMISSION_MIN}+ attestation points. A letter grade appears once the final exam is entered; with no final by the end of the semester it is
                  an F.
                </p>
              </div>
            )}
          </form>
        )
      }
    </QueryState>
  );
}
