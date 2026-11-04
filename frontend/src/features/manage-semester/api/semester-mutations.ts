import type { Semester } from "@/entities/semester";
import { apiRequest, components } from "@/shared/api";

export type SemesterCreate = components["schemas"]["SemesterCreate"];

export const createSemester = (json: SemesterCreate) => apiRequest<Semester>("/semesters", { method: "POST", json });
export const updateSemester = (id: number, json: Partial<SemesterCreate>) => apiRequest<Semester>(`/semesters/${id}`, { method: "PATCH", json });
export const deleteSemester = (id: number) => apiRequest<{ message: string }>(`/semesters/${id}`, { method: "DELETE" });
