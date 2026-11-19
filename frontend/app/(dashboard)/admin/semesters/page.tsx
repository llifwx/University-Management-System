import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SemesterManagementPage } from "@/pages/semester-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminSemesters") };
}

export default function Page() {
  return <SemesterManagementPage />;
}
