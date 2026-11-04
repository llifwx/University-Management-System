import type { Metadata } from "next";

import { TeacherDashboardPage } from "@/pages/teacher-dashboard";

export const metadata: Metadata = { title: "Teaching dashboard" };

export default function Page() {
  return <TeacherDashboardPage />;
}
