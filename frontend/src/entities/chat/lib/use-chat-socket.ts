"use client";

import { useEffect, useRef } from "react";

import { createWsTicket } from "../api/chat-mutations";
import type { ChatSocketEvent } from "../model/types";

const RETRY_DELAY_MS = 3000;

/**
 * The browser connects straight to the backend (ticket-authenticated, since the
 * real JWT lives in an HttpOnly cookie the BFF proxy never exposes). The BFF
 * proxy itself cannot tunnel a WebSocket upgrade, so this is a deliberate
 * exception to "the browser only talks to the same-origin proxy".
 */
export function useChatSocket(wsUrl: string, enabled: boolean, onMessage: (event: ChatSocketEvent) => void) {
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
        const { ticket } = await createWsTicket();
        if (closed) return;
        socket = new WebSocket(`${wsUrl}/chat/ws?ticket=${encodeURIComponent(ticket)}`);
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ChatSocketEvent;
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
