export { createMessagingWsTicket, markMessagingThreadRead, sendMessageTo } from "./api/messaging-mutations";
export { messagingQueries } from "./api/messaging-queries";
export { useMessagingSocket } from "./lib/use-messaging-socket";
export type { Contact, DirectMessage, MessagingSocketEvent, MessagingTicket } from "./model/types";
