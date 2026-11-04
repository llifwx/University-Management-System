import type { components } from "@/shared/api";

export type Section = components["schemas"]["SectionOut"];
export type Meeting = components["schemas"]["MeetingOut"];
export type SectionFilters = { semester_id?: number; course_id?: number; teacher_id?: number; available_only?: boolean };
