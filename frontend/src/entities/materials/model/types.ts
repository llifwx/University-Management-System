import type { components } from "@/shared/api";

export type Material = components["schemas"]["MaterialOut"];

export const MATERIAL_CATEGORIES = ["syllabus", "homework", "practice", "other"] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
