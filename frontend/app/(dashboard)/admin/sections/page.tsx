import type { Metadata } from "next";

import { SectionManagementPage } from "@/pages/section-management";

export const metadata: Metadata = { title: "Sections" };

export default function Page() {
  return <SectionManagementPage />;
}
