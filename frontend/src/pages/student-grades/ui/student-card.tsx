"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { studentQueries } from "@/entities/student";
import { Card, CardContent } from "@/shared/ui/card";

export function StudentCard({ studentId }: { studentId?: number }) {
  const t = useTranslations("pages.studentGrades.studentCard");
  const me = useQuery({ ...studentQueries.me(), enabled: !studentId });
  const other = useQuery({ ...studentQueries.detail(studentId ?? 0), enabled: !!studentId });
  const data = studentId ? other.data : me.data;
  if (!data) return null;
  const rows = [
    [t("program"), data.program ?? t("notSet")],
    [t("id"), data.student_number],
    [t("student"), data.full_name],
    [t("yearOfStudy"), data.year_level],
  ];
  return (
    <Card className="mx-auto mb-6 max-w-md shadow-sm">
      <CardContent className="p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-right font-medium">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
