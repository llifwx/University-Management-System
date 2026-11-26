"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { ATTENDANCE_STATUSES, AttendanceStatus, CourseAttendance, attendanceQueries } from "@/entities/attendance";
import { formatTime } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

/** Below this share of attended classes a course is flagged as at risk. */
const WARN_RATE = 70;

const DOT: Record<AttendanceStatus, string> = { PRESENT: "bg-emerald-600", LATE: "bg-amber-500", ABSENT: "bg-red-600" };
const COUNT = { PRESENT: "present", LATE: "late", ABSENT: "absent" } as const satisfies Record<AttendanceStatus, keyof CourseAttendance>;

function rateColor(rate: number) {
  if (rate >= 85) return "bg-emerald-600";
  return rate >= WARN_RATE ? "bg-amber-500" : "bg-red-600";
}

function CourseCard({ course }: { course: CourseAttendance }) {
  const t = useTranslations("pages.attendance.student");
  const tStatus = useTranslations("entities.attendance.status");
  const format = useFormatter();
  const { rate } = course;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{course.course_code}</p>
          <p className="text-muted-foreground truncate text-sm">{course.course_title}</p>
        </div>
        <p className={cn("text-2xl font-semibold tabular-nums", rate !== null && rate < WARN_RATE && "text-red-600")}>{rate === null ? "—" : `${rate}%`}</p>
      </div>
      <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={rate ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={t("rateLabel")}>
        {rate !== null && <div className={cn("h-full", rateColor(rate))} style={{ width: `${rate}%` }} />}
      </div>
      <dl className="mt-3 flex gap-4 text-sm">
        {ATTENDANCE_STATUSES.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", DOT[status])} aria-hidden />
            <dt className="text-muted-foreground">{tStatus(status)}</dt>
            <dd className="font-medium tabular-nums">{course[COUNT[status]]}</dd>
          </div>
        ))}
      </dl>
      {rate !== null && rate < WARN_RATE && <p className="mt-2 text-xs text-red-600">{t("warning", { min: WARN_RATE })}</p>}
      {course.records.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="text-muted-foreground cursor-pointer">{t("history", { count: course.records.length })}</summary>
          <ul className="mt-2 divide-y">
            {course.records.map((record) => (
              <li key={`${record.class_date}-${record.start_time}`} className="flex items-center justify-between gap-2 py-1.5">
                <span className="tabular-nums">
                  {format.dateTime(new Date(`${record.class_date}T00:00`), { weekday: "short", day: "numeric", month: "short" })}
                  <span className="text-muted-foreground"> · {formatTime(record.start_time)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", DOT[record.status])} aria-hidden />
                  {tStatus(record.status)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export function StudentAttendancePage() {
  const t = useTranslations("pages.attendance.student");
  const attendance = useQuery(attendanceQueries.mine());
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <QueryState query={attendance}>
        {({ semesters }) =>
          semesters.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title={t("empty")} />
          ) : (
            <div className="space-y-8">
              {semesters.map((semester) => (
                <section key={semester.semester_id} className="space-y-3">
                  <h2 className="text-lg font-semibold">{semester.name}</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {semester.courses.map((course) => (
                      <CourseCard key={course.section_id} course={course} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
