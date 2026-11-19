import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CourseCatalogPage } from "@/pages/course-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("courseCatalog") };
}

export default function Page() {
  return <CourseCatalogPage />;
}
