import type { Metadata } from "next";

import { StudentManagementPage } from "@/pages/student-management";

export const metadata: Metadata = { title: "Students" };

export default function Page() {
  return <StudentManagementPage />;
}
