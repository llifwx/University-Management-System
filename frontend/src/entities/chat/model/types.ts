import type { components } from "@/shared/api";

export type ChatThread = components["schemas"]["ThreadOut"];
export type ChatMessage = components["schemas"]["MessageOut"];
export type ChatTicket = components["schemas"]["TicketOut"];
export type ChatSocketEvent = { type: "message"; message: ChatMessage; thread: ChatThread };
