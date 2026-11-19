import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeacherSchedulePage } from "@/pages/teacher-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("teacherSchedule") };
}

export default function Page() {
  return <TeacherSchedulePage />;
}
