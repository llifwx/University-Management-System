import type { Metadata } from "next";

import { TeacherSchedulePage } from "@/pages/teacher-dashboard";

export const metadata: Metadata = { title: "Teaching schedule" };

export default function Page() {
  return <TeacherSchedulePage />;
}
