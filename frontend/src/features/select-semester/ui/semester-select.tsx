"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("features.selectSemester");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("label")}</Label>
      <NativeSelect
        id={id}
        className="sm:w-52"
        disabled={!semesters}
        value={value ?? ALL}
        onChange={(event) => onChange(event.target.value === ALL ? undefined : Number(event.target.value))}
      >
        {allowAll && <option value={ALL}>{t("allOption")}</option>}
        {semesters?.map((semester) => (
          <option key={semester.semester_id} value={semester.semester_id}>
            {semester.name}
            {semester.is_active ? "" : t("closedSuffix")}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
