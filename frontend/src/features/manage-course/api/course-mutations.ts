import type { Course } from "@/entities/course";
import { apiRequest, components } from "@/shared/api";

export type CourseCreate = components["schemas"]["CourseCreate"];

export const createCourse = (json: CourseCreate) => apiRequest<Course>("/courses", { method: "POST", json });
export const updateCourse = (id: number, json: CourseCreate) => apiRequest<Course>(`/courses/${id}`, { method: "PATCH", json });
export const deleteCourse = (id: number) => apiRequest<{ message: string }>(`/courses/${id}`, { method: "DELETE" });
