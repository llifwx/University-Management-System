import { queryOptions } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api";

import type { GradeSheetRow, StudentGrades } from "../model/types";

export const gradeQueries = {
  all: ["grades"] as const,
  sheet: (sectionId: number) =>
    queryOptions({ queryKey: ["grades", "sheet", sectionId], queryFn: ({ signal }) => apiRequest<GradeSheetRow[]>(`/sections/${sectionId}/grades`, { signal }) }),
  mine: () => queryOptions({ queryKey: ["grades", "mine"], queryFn: ({ signal }) => apiRequest<StudentGrades>("/students/me/grades", { signal }) }),
};
