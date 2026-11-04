"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, CalendarDays, ClipboardList, Search } from "lucide-react";
import Link from "next/link";

import { registrationQueries } from "@/entities/registration";
import { scheduleQueries, upcomingClasses } from "@/entities/schedule";
import { pickCurrentSemester, semesterQueries } from "@/entities/semester";
import { studentQueries } from "@/entities/student";
import { formatTime } from "@/shared/lib/time";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatCard } from "@/shared/ui/stat-card";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { WeeklyTimetable, scheduleToEvents } from "@/widgets/weekly-timetable";

export function StudentDashboardPage() {
  const student = useQuery(studentQueries.me());
  const semesters = useQuery(semesterQueries.list());
  const semester = semesters.data && pickCurrentSemester(semesters.data);
  const semesterId = semester?.semester_id;
  const schedule = useQuery({ ...scheduleQueries.me(semesterId ?? 0), enabled: semesterId !== undefined });
  const registrations = useQuery({ ...registrationQueries.mine(semesterId), enabled: semesterId !== undefined });

  const enrolled = registrations.data?.filter((r) => r.status === "Enrolled").length;
  const weeklyClasses = schedule.data?.entries.length;
  const upcoming = schedule.data && semester ? upcomingClasses(schedule.data.entries, semester) : [];
  const noSemester = semesters.data !== undefined && !semester;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {student.data ? (
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {student.data.full_name}</h1>
          ) : (
            <Skeleton className="h-8 w-64" />
          )}
          <p className="text-muted-foreground mt-1 text-sm">{semester ? semester.name : " "}</p>
        </div>
        <Button asChild>
          <Link href="/courses">
            <Search aria-hidden />
            Find courses
          </Link>
        </Button>
      </div>

      {noSemester ? (
        <EmptyState title="No semesters yet" description="Once the university publishes a semester, your classes appear here." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Current semester" value={semester?.name} icon={CalendarDays} />
            <StatCard label="Enrolled sections" value={enrolled} icon={BookOpen} />
            <StatCard label="Weekly classes" value={weeklyClasses} icon={ClipboardList} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
            <section aria-labelledby="week-heading" className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="week-heading" className="font-semibold">
                  This week
                </h2>
                <Button variant="link" size="sm" asChild>
                  <Link href="/schedule">Full schedule</Link>
                </Button>
              </div>
              <QueryState query={schedule}>{(data) => <WeeklyTimetable events={scheduleToEvents(data.entries)} emptyMessage="You are not enrolled in any class this semester." />}</QueryState>
            </section>
            <Card className="h-fit shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Upcoming classes</CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nothing coming up.</p>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.map(({ entry, at }) => (
                      <li key={`${entry.registration_id}-${entry.meeting_day}-${entry.start_time}`} className="text-sm">
                        <p className="font-medium">
                          {entry.course_code} · {entry.course_title}
                        </p>
                        <p className="text-muted-foreground tabular-nums">
                          {format(at, "EEE, MMM d")} · {formatTime(entry.start_time)}–{formatTime(entry.end_time)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
