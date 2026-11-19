import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CourseManagementPage } from "@/pages/course-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminCourses") };
}

export default function Page() {
  return <CourseManagementPage />;
}
