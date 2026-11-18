import type { GradeInput, GradeSheet } from "@/entities/grade";
import { apiRequest } from "@/shared/api";

export const saveGrades = (sectionId: number, json: GradeInput[]) => apiRequest<GradeSheet>(`/sections/${sectionId}/grades`, { method: "PATCH", json });
