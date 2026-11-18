import type { GradeInput, GradeSheetRow } from "@/entities/grade";
import { apiRequest } from "@/shared/api";

export const saveGrades = (sectionId: number, json: GradeInput[]) => apiRequest<GradeSheetRow[]>(`/sections/${sectionId}/grades`, { method: "PATCH", json });
