import { queryOptions } from "@tanstack/react-query";

import { apiRequest, fetchAllPages, fetchTotal } from "@/shared/api";

import type { Course } from "../model/types";

export const courseQueries = {
  all: ["courses"] as const,
  list: () => queryOptions({ queryKey: ["courses", "list"], queryFn: ({ signal }) => fetchAllPages<Course>("/courses", { signal }) }),
  detail: (id: number) => queryOptions({ queryKey: ["courses", "detail", id], queryFn: ({ signal }) => apiRequest<Course>(`/courses/${id}`, { signal }) }),
  total: () => queryOptions({ queryKey: ["courses", "total"], queryFn: ({ signal }) => fetchTotal("/courses", signal) }),
};
