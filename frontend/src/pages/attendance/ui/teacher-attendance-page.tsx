"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { attendanceQueries } from "@/entities/attendance";
import { AttendanceSheet } from "@/features/take-attendance";
import { formatTime } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function TeacherAttendancePage() {
  const t = useTranslations("pages.attendance.teacher");
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const classes = useQuery(attendanceQueries.classes(date));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="attendance-date">{t("date")}</Label>
          <Input
            id="attendance-date"
            type="date"
            max={today}
            value={date}
            onChange={(event) => {
              if (!event.target.value) return;
              setDate(event.target.value);
              setMeetingId(null);
            }}
            className="w-44"
          />
        </div>
      </div>
      <QueryState query={classes}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={CalendarX} title={t("noClasses")} />
          ) : (
            <div className="space-y-6">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("classesLabel")}>
                {rows.map((lesson) => {
                  const selected = lesson.meeting_id === meetingId;
                  const done = lesson.enrolled > 0 && lesson.marked === lesson.enrolled;
                  return (
                    <li key={lesson.meeting_id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setMeetingId(lesson.meeting_id)}
                        className={cn(
                          "bg-card hover:bg-muted/50 w-full rounded-xl border p-4 text-left shadow-sm transition-colors",
                          selected && "border-primary ring-primary ring-1",
                        )}
                      >
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
                          {lesson.room_code && ` · ${lesson.room_code}`}
                        </p>
                        <p className="mt-1 font-medium">
                          {lesson.course_code} · {lesson.course_title}
                        </p>
                        <p className="text-muted-foreground text-sm">{t("section", { number: lesson.section_number })}</p>
                        <p className={cn("mt-2 text-xs font-medium", done ? "text-emerald-600" : "text-muted-foreground")}>
                          {t("marked", { marked: lesson.marked, total: lesson.enrolled })}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {meetingId !== null ? (
                <section aria-label={t("sheetLabel")}>
                  <AttendanceSheet key={`${meetingId}-${date}`} meetingId={meetingId} date={date} editable={date <= today} />
                </section>
              ) : (
                <p className="text-muted-foreground text-sm">{t("pickClass")}</p>
              )}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
