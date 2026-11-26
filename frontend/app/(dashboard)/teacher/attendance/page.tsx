import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeacherAttendancePage } from "@/pages/attendance";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("attendance") };
}

export default function Page() {
  return <TeacherAttendancePage />;
}
