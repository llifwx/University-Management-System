import type { CourseGrade, GradeSummary, SemesterGrades } from "@/entities/grade";
import { Card } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export const score = (value: number | null | undefined) => (value == null ? "" : value.toFixed(2));

export const summaryLine = (s: GradeSummary) =>
  `Credits taken ${s.credits_taken}. Credits earned ${s.credits_earned}. ECTS taken ${s.ects_taken}. ECTS earned ${s.ects_earned}. GPA ${s.gpa?.toFixed(2) ?? "—"}.`;

export type GradeColumn = { header: string; cell: (course: CourseGrade) => React.ReactNode };

/** One semester block shared by the transcript and the attestation pages. */
export function SemesterTable({ semester, columns, summary }: { semester: SemesterGrades; columns: GradeColumn[]; summary?: boolean }) {
  return (
    <Card className="gap-0 break-inside-avoid py-0 shadow-sm">
      <h2 className="bg-muted/50 border-b px-4 py-2 font-semibold">{semester.name}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            {columns.map((c) => (
              <TableHead key={c.header}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {semester.courses.map((course) => (
            <TableRow key={course.section_id}>
              <TableCell>{course.course_code}</TableCell>
              <TableCell className="w-full whitespace-normal">{course.course_title}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.header}>{c.cell(course)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {summary && <p className="border-t px-4 py-2 text-sm font-semibold">{summaryLine(semester.summary)}</p>}
    </Card>
  );
}
