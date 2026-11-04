import { queryOptions } from "@tanstack/react-query";

import { apiRequest, fetchAllPages, fetchTotal } from "@/shared/api";

import type { Student } from "../model/types";

export const studentQueries = {
  all: ["students"] as const,
  me: () => queryOptions({ queryKey: ["students", "me"], queryFn: ({ signal }) => apiRequest<Student>("/students/me", { signal }) }),
  list: () => queryOptions({ queryKey: ["students", "list"], queryFn: ({ signal }) => fetchAllPages<Student>("/students", { signal }) }),
  total: () => queryOptions({ queryKey: ["students", "total"], queryFn: ({ signal }) => fetchTotal("/students", signal) }),
};
