import type { Metadata } from "next";

import { RegistrationsManagementPage } from "@/pages/registrations-management";

export const metadata: Metadata = { title: "Registrations" };

export default function Page() {
  return <RegistrationsManagementPage />;
}
