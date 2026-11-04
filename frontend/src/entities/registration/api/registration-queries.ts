import { queryOptions } from "@tanstack/react-query";

import { fetchAllPages } from "@/shared/api";

import type { Registration } from "../model/types";

export const registrationQueries = {
  all: ["registrations"] as const,
  mine: (semesterId?: number) =>
    queryOptions({
      queryKey: ["registrations", "mine", semesterId ?? "all"],
      queryFn: ({ signal }) => fetchAllPages<Registration>("/registrations/me", { query: { semester_id: semesterId }, signal }),
    }),
  list: (filters: { semester_id?: number; section_id?: number } = {}) =>
    queryOptions({
      queryKey: ["registrations", "list", filters],
      queryFn: ({ signal }) => fetchAllPages<Registration>("/registrations", { query: filters, signal }),
    }),
};
