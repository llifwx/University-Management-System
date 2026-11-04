import type { Student } from "@/entities/student";
import { apiRequest, components } from "@/shared/api";

export const createStudent = (json: components["schemas"]["StudentCreate"]) => apiRequest<Student>("/students", { method: "POST", json });
export const updateStudent = (id: number, json: components["schemas"]["StudentPatch"]) => apiRequest<Student>(`/students/${id}`, { method: "PATCH", json });
export const deactivateStudent = (id: number) => apiRequest<{ message: string }>(`/students/${id}`, { method: "DELETE" });
