import { queryOptions } from "@tanstack/react-query";

import { apiRequest, components } from "@/shared/api";

export type AttendanceStatus = components["schemas"]["AttendanceRecord"]["status"];
export type ClassSession = components["schemas"]["ClassOut"];
export type AttendanceSheet = components["schemas"]["AttendanceSheet"];
export type AttendanceInput = components["schemas"]["AttendanceInput"];
export type CourseAttendance = components["schemas"]["CourseAttendance"];
export type StudentAttendance = components["schemas"]["StudentAttendance"];

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const satisfies readonly AttendanceStatus[];

export const attendanceQueries = {
  all: ["attendance"] as const,
  /** The signed-in teacher's classes on a date (YYYY-MM-DD). */
  classes: (date: string) =>
    queryOptions({
      queryKey: ["attendance", "classes", date],
      queryFn: ({ signal }) => apiRequest<ClassSession[]>("/attendance/classes", { query: { date }, signal }),
    }),
  sheet: (meetingId: number, date: string) =>
    queryOptions({
      queryKey: ["attendance", "classes", date, meetingId],
      queryFn: ({ signal }) => apiRequest<AttendanceSheet>(`/attendance/classes/${meetingId}`, { query: { date }, signal }),
    }),
  mine: () => queryOptions({ queryKey: ["attendance", "me"], queryFn: ({ signal }) => apiRequest<StudentAttendance>("/students/me/attendance", { signal }) }),
};

export const saveAttendance = (meetingId: number, date: string, json: AttendanceInput[]) =>
  apiRequest<AttendanceSheet>(`/attendance/classes/${meetingId}`, { method: "PATCH", query: { date }, json });
