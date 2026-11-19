import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StudentManagementPage } from "@/pages/student-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminStudents") };
}

export default function Page() {
  return <StudentManagementPage />;
}
