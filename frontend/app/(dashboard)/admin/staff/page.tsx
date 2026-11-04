import type { Metadata } from "next";

import { StaffManagementPage } from "@/pages/staff-management";

export const metadata: Metadata = { title: "Staff" };

export default function Page() {
  return <StaffManagementPage />;
}
