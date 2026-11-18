"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GradeInput, GradeSheetRow, gradeQueries } from "@/entities/grade";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EmptyState, QueryState } from "@/shared/ui/states";

import { saveGrades } from "../api/save-grades";

const FIELDS = [
  { key: "attestation_1", label: "Attestation 1", max: 30 },
  { key: "attestation_2", label: "Attestation 2", max: 30 },
  { key: "final_exam", label: "Final exam", max: 40 },
] as const;
type Field = (typeof FIELDS)[number]["key"];
type Draft = Record<number, Partial<Record<Field, string>>>;

/** Empty clears the mark; anything else must be a number within 0..max. */
function parse(value: string, max: number): number | null | undefined {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number * 100) / 100 : undefined;
}

export function GradeSheet({ sectionId }: { sectionId: number }) {
  const queryClient = useQueryClient();
  const sheet = useQuery(gradeQueries.sheet(sectionId));
  const [draft, setDraft] = useState<Draft>({});

  const mutation = useMutation({
    mutationFn: (rows: GradeInput[]) => saveGrades(sectionId, rows),
    onSuccess: (rows) => {
      queryClient.setQueryData(gradeQueries.sheet(sectionId).queryKey, rows);
      setDraft({});
      toast.success("Grades saved.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const valueOf = (row: GradeSheetRow, key: Field) => draft[row.registration_id]?.[key] ?? row[key]?.toString() ?? "";

  const submit = (rows: GradeSheetRow[]) => {
    const payload: GradeInput[] = [];
    for (const row of rows.filter((r) => draft[r.registration_id])) {
      const item: GradeInput = { registration_id: row.registration_id };
      for (const { key, label, max } of FIELDS) {
        const parsed = parse(valueOf(row, key), max);
        if (parsed === undefined) return toast.error(`${row.full_name}: ${label} must be between 0 and ${max}.`);
        item[key] = parsed;
      }
      payload.push(item);
    }
    mutation.mutate(payload);
  };

  return (
    <QueryState query={sheet}>
      {(rows) =>
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
                {rows.map((row) => (
                  <TableRow key={row.registration_id}>
                    <TableCell className="tabular-nums">{row.student_number}</TableCell>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    {FIELDS.map(({ key, label, max }) => (
                      <TableCell key={key}>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={max}
                          step={0.01}
                          aria-label={`${label} for ${row.full_name}`}
                          value={valueOf(row, key)}
                          onChange={(event) => setDraft((d) => ({ ...d, [row.registration_id]: { ...d[row.registration_id], [key]: event.target.value } }))}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="tabular-nums">{row.total.toFixed(2)}</TableCell>
                    <TableCell>{row.letter ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={mutation.isPending || Object.keys(draft).length === 0}>
                {mutation.isPending ? "Saving…" : "Save grades"}
              </Button>
              {Object.keys(draft).length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setDraft({})}>
                  Discard changes
                </Button>
              )}
              <p className="text-muted-foreground text-sm">The letter grade appears once the final exam mark is entered.</p>
            </div>
          </form>
        )
      }
    </QueryState>
  );
}
