import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MessagesPage } from "@/pages/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("messages") };
}

export default function Page() {
  const wsUrl = process.env.CHAT_WS_URL ?? "ws://localhost:8000/api/v1";
  return <MessagesPage wsUrl={wsUrl} />;
}
