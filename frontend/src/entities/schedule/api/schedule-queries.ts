import { queryOptions } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api";

import type { Schedule } from "../model/types";

export const scheduleQueries = {
  all: ["schedule"] as const,
  me: (semesterId: number) =>
    queryOptions({
      queryKey: ["schedule", "me", semesterId],
      queryFn: ({ signal }) => apiRequest<Schedule>("/schedules/me", { query: { semester_id: semesterId }, signal }),
    }),
};
