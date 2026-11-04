import { queryOptions } from "@tanstack/react-query";

import { fetchAllPages } from "@/shared/api";

import type { Semester } from "../model/types";

export const semesterQueries = {
  all: ["semesters"] as const,
  list: () => queryOptions({ queryKey: ["semesters", "list"], queryFn: ({ signal }) => fetchAllPages<Semester>("/semesters", { signal }) }),
};
