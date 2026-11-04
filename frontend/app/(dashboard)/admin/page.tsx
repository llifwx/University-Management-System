import type { Metadata } from "next";

import { AdminDashboardPage } from "@/pages/admin-dashboard";

export const metadata: Metadata = { title: "Administration" };

export default function Page() {
  return <AdminDashboardPage />;
}
