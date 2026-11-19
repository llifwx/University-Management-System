import type { Metadata } from "next";

import { RoomManagementPage } from "@/pages/room-management";

export const metadata: Metadata = { title: "Rooms" };

export default function Page() {
  return <RoomManagementPage />;
}
