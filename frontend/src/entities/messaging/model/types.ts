import type { components } from "@/shared/api";

export type Contact = components["schemas"]["ContactOut"];
export type DirectMessage = components["schemas"]["DirectMessageOut"];
export type MessagingTicket = components["schemas"]["MessagingTicketOut"];
export type MessagingSocketEvent = { type: "message"; message: DirectMessage; counterpart_id: number };
