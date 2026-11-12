import { queryOptions } from "@tanstack/react-query";

import { apiRequest, Page } from "@/shared/api";

import type { ChatMessage, ChatThread } from "../model/types";

export const chatQueries = {
  all: ["chat"] as const,
  myThread: () =>
    queryOptions({
      queryKey: ["chat", "my-thread"],
      queryFn: ({ signal }) => apiRequest<ChatThread>("/chat/threads/me", { signal }),
    }),
  myMessages: () =>
    queryOptions({
      queryKey: ["chat", "my-messages"],
      queryFn: ({ signal }) => apiRequest<Page<ChatMessage>>("/chat/threads/me/messages", { query: { limit: 100 }, signal }),
    }),
  threads: () =>
    queryOptions({
      queryKey: ["chat", "threads"],
      queryFn: ({ signal }) => apiRequest<Page<ChatThread>>("/chat/threads", { query: { limit: 100 }, signal }),
    }),
  threadMessages: (threadId: number) =>
    queryOptions({
      queryKey: ["chat", "threads", threadId, "messages"],
      queryFn: ({ signal }) => apiRequest<Page<ChatMessage>>(`/chat/threads/${threadId}/messages`, { query: { limit: 100 }, signal }),
    }),
};
