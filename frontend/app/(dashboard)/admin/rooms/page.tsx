import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoomManagementPage } from "@/pages/room-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminRooms") };
}

export default function Page() {
  return <RoomManagementPage />;
}
