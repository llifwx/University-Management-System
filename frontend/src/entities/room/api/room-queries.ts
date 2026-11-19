import { queryOptions } from "@tanstack/react-query";

import { fetchAllPages } from "@/shared/api";

import type { Room } from "../model/types";

export const roomQueries = {
  all: ["rooms"] as const,
  list: () => queryOptions({ queryKey: ["rooms", "list"], queryFn: ({ signal }) => fetchAllPages<Room>("/rooms", { signal }) }),
};
