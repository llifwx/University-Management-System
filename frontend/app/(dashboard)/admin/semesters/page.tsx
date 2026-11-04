import type { Metadata } from "next";

import { SemesterManagementPage } from "@/pages/semester-management";

export const metadata: Metadata = { title: "Semesters" };

export default function Page() {
  return <SemesterManagementPage />;
}
