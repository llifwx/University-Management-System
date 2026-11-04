import type { Metadata } from "next";

import { CourseCatalogPage } from "@/pages/course-catalog";

export const metadata: Metadata = { title: "Course catalog" };

export default function Page() {
  return <CourseCatalogPage />;
}
