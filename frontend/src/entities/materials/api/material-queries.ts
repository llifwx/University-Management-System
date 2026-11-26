import { queryOptions } from "@tanstack/react-query";

import { fetchAllPages } from "@/shared/api";

import type { Material } from "../model/types";

export type MaterialFilters = { section_id?: number; category?: string };

export const materialQueries = {
  all: ["materials"] as const,
  list: (filters: MaterialFilters = {}) =>
    queryOptions({
      queryKey: ["materials", "list", filters],
      queryFn: ({ signal }) => fetchAllPages<Material>("/materials", { query: filters, signal }),
    }),
};
