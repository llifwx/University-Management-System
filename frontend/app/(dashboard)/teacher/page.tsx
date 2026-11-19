import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeacherDashboardPage } from "@/pages/teacher-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("teacherDashboard") };
}

export default function Page() {
  return <TeacherDashboardPage />;
}
