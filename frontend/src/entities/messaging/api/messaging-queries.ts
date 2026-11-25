import { queryOptions } from "@tanstack/react-query";

import { apiRequest, Page } from "@/shared/api";

import type { Contact, DirectMessage } from "../model/types";

export const messagingQueries = {
  all: ["messaging"] as const,
  contacts: () =>
    queryOptions({
      queryKey: ["messaging", "contacts"],
      queryFn: ({ signal }) => apiRequest<Page<Contact>>("/messaging/contacts", { query: { limit: 100 }, signal }),
    }),
  messagesWith: (counterpartId: number) =>
    queryOptions({
      queryKey: ["messaging", "with", counterpartId, "messages"],
      queryFn: ({ signal }) => apiRequest<Page<DirectMessage>>(`/messaging/with/${counterpartId}/messages`, { query: { limit: 100 }, signal }),
    }),
};
