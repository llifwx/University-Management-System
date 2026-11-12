import type { Metadata } from "next";

import { AdminSupportChatPage } from "@/pages/admin-support-chat";

export const metadata: Metadata = { title: "Support chat" };

export default function Page() {
  const wsUrl = process.env.CHAT_WS_URL ?? "ws://localhost:8000/api/v1";
  return <AdminSupportChatPage wsUrl={wsUrl} />;
}
