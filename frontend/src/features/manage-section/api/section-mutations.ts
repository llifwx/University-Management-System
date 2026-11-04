import type { Section } from "@/entities/course-section";
import { apiRequest, components } from "@/shared/api";

export const createSection = (json: components["schemas"]["SectionCreate"]) => apiRequest<Section>("/sections", { method: "POST", json });
export const updateSection = (id: number, json: components["schemas"]["SectionPatch"]) => apiRequest<Section>(`/sections/${id}`, { method: "PATCH", json });
export const deleteSection = (id: number) => apiRequest<{ message: string }>(`/sections/${id}`, { method: "DELETE" });
