import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MaterialsPage } from "@/pages/materials";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("materials") };
}

export default function Page() {
  return <MaterialsPage />;
}
