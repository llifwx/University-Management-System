import { apiRequest, apiUpload } from "@/shared/api";

import type { DirectMessage, MessagingTicket } from "../model/types";

type SendMessageInput = { counterpartId: number; body?: string; file?: File | null };

export function sendMessageTo({ counterpartId, body, file }: SendMessageInput) {
  return apiUpload<DirectMessage>(`/messaging/with/${counterpartId}/messages`, file ?? null, undefined, body ? { body } : undefined);
}

export function markMessagingThreadRead(counterpartId: number) {
  return apiRequest<{ message: string }>(`/messaging/with/${counterpartId}/read`, { method: "POST" });
}

export function createMessagingWsTicket() {
  return apiRequest<MessagingTicket>("/messaging/ws-ticket", { method: "POST" });
}
