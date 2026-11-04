"use client";

import type { Semester } from "@/entities/semester";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";

const ALL = "all";

export function SemesterSelect({
  semesters,
  value,
  onChange,
  allowAll = false,
  id = "semester-filter",
}: {
  semesters: Semester[] | undefined;
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  allowAll?: boolean;
  id?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Semester</Label>
      <NativeSelect
        id={id}
        className="sm:w-52"
        disabled={!semesters}
        value={value ?? ALL}
        onChange={(event) => onChange(event.target.value === ALL ? undefined : Number(event.target.value))}
      >
        {allowAll && <option value={ALL}>All semesters</option>}
        {semesters?.map((semester) => (
          <option key={semester.semester_id} value={semester.semester_id}>
            {semester.name}
            {semester.is_active ? "" : " (closed)"}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
