import { queryOptions } from "@tanstack/react-query";

import { apiRequest, fetchAllPages } from "@/shared/api";

import type { components } from "@/shared/api";

import type { Section, SectionFilters } from "../model/types";

export type RosterStudent = components["schemas"]["StudentOut"];

export const sectionQueries = {
  all: ["sections"] as const,
  list: (filters: SectionFilters = {}) =>
    queryOptions({ queryKey: ["sections", "list", filters], queryFn: ({ signal }) => fetchAllPages<Section>("/sections", { query: filters, signal }) }),
  detail: (id: number) => queryOptions({ queryKey: ["sections", "detail", id], queryFn: ({ signal }) => apiRequest<Section>(`/sections/${id}`, { signal }) }),
  assigned: (semesterId?: number) =>
    queryOptions({
      queryKey: ["sections", "assigned", semesterId ?? "all"],
      queryFn: ({ signal }) => fetchAllPages<Section>("/sections/assigned", { query: { semester_id: semesterId }, signal }),
    }),
  roster: (id: number) =>
    queryOptions({ queryKey: ["sections", "roster", id], queryFn: ({ signal }) => fetchAllPages<RosterStudent>(`/sections/${id}/enrollments`, { signal }) }),
};
