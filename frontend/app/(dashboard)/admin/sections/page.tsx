import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionManagementPage } from "@/pages/section-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminSections") };
}

export default function Page() {
  return <SectionManagementPage />;
}
