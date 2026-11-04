import type { Metadata } from "next";

import { CourseManagementPage } from "@/pages/course-management";

export const metadata: Metadata = { title: "Courses" };

export default function Page() {
  return <CourseManagementPage />;
}
