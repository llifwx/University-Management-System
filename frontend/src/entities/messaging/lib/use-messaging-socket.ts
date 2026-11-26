"use client";

import { useEffect, useRef } from "react";

import { createMessagingWsTicket } from "../api/messaging-mutations";
import type { MessagingSocketEvent } from "../model/types";

const RETRY_DELAY_MS = 3000;

/**
 * Same deliberate exception as the support chat socket: the browser connects straight to the
 * backend (ticket-authenticated), since the BFF proxy cannot tunnel a WebSocket upgrade.
 */
export function useMessagingSocket(wsUrl: string, enabled: boolean, onMessage: (event: MessagingSocketEvent) => void) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled) return;
    let socket: WebSocket | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      if (closed) return;
      try {
        const { ticket } = await createMessagingWsTicket();
        if (closed) return;
        socket = new WebSocket(`${wsUrl}/messaging/ws?ticket=${encodeURIComponent(ticket)}`);
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as MessagingSocketEvent;
            if (data.type === "message") onMessageRef.current(data);
          } catch {
            // Ignore malformed frames.
          }
        };
        socket.onclose = () => {
          if (!closed) retryTimer = setTimeout(connect, RETRY_DELAY_MS);
        };
      } catch {
        if (!closed) retryTimer = setTimeout(connect, RETRY_DELAY_MS);
      }
    }

    void connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [wsUrl, enabled]);
}
