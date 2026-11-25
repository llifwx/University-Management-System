import { queryOptions } from "@tanstack/react-query";

import { apiRequest, components, fetchAllPages } from "@/shared/api";

export type News = components["schemas"]["NewsOut"];

export const newsQueries = {
  all: ["news"] as const,
  // ponytail: loads every news item; switch to paged infinite query if the feed grows to thousands.
  list: () => queryOptions({ queryKey: ["news", "list"], queryFn: ({ signal }) => fetchAllPages<News>("/news", { signal }) }),
  detail: (id: number) => queryOptions({ queryKey: ["news", id], queryFn: ({ signal }) => apiRequest<News>(`/news/${id}`, { signal }) }),
};
