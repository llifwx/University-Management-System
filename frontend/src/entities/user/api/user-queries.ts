import { queryOptions } from "@tanstack/react-query";

import { fetchAllPages } from "@/shared/api";

import type { User } from "../model/types";

/** /users is admin-only, so teacher emails can only be shown to admins. */
export const userQueries = {
  all: ["users"] as const,
  list: () => queryOptions({ queryKey: ["users", "list"], queryFn: ({ signal }) => fetchAllPages<User>("/users", { signal }) }),
};
