"use client";

import { useQuery } from "@tanstack/react-query";

import { studentQueries } from "@/entities/student";
import { Card, CardContent } from "@/shared/ui/card";

export function StudentCard({ studentId }: { studentId?: number }) {
  const me = useQuery({ ...studentQueries.me(), enabled: !studentId });
  const other = useQuery({ ...studentQueries.detail(studentId ?? 0), enabled: !!studentId });
  const data = studentId ? other.data : me.data;
  if (!data) return null;
  const rows = [
    ["Program", data.program ?? "Not set"],
    ["ID", data.student_number],
    ["Student", data.full_name],
    ["Year of study", data.year_level],
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
