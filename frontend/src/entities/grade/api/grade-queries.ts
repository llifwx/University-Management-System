import { queryOptions } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api";

import type { GradeSheet, StudentGrades } from "../model/types";

export const gradeQueries = {
  all: ["grades"] as const,
  sheet: (sectionId: number) =>
    queryOptions({ queryKey: ["grades", "sheet", sectionId], queryFn: ({ signal }) => apiRequest<GradeSheet>(`/sections/${sectionId}/grades`, { signal }) }),
  /** A student's own grades, or (admins only) any student's. */
  of: (studentId?: number) =>
    queryOptions({
      queryKey: ["grades", "student", studentId ?? "me"],
      queryFn: ({ signal }) => apiRequest<StudentGrades>(`/students/${studentId ?? "me"}/grades`, { signal }),
    }),
};
