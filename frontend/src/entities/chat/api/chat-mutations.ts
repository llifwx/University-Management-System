import { apiRequest, apiUpload } from "@/shared/api";

import type { ChatMessage, ChatTicket } from "../model/types";

type SendMessageInput = { body?: string; file?: File | null };

export function sendMyMessage({ body, file }: SendMessageInput) {
  return apiUpload<ChatMessage>("/chat/threads/me/messages", file ?? null, undefined, body ? { body } : undefined);
}

export function markMyThreadRead() {
  return apiRequest<{ message: string }>("/chat/threads/me/read", { method: "POST" });
}

export function replyToThread({ threadId, body, file }: SendMessageInput & { threadId: number }) {
  return apiUpload<ChatMessage>(`/chat/threads/${threadId}/messages`, file ?? null, undefined, body ? { body } : undefined);
}

export function markThreadRead(threadId: number) {
  return apiRequest<{ message: string }>(`/chat/threads/${threadId}/read`, { method: "POST" });
}

export function createWsTicket() {
  return apiRequest<ChatTicket>("/chat/ws-ticket", { method: "POST" });
}
