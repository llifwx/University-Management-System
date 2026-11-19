import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RegistrationsManagementPage } from "@/pages/registrations-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminRegistrations") };
}

export default function Page() {
  return <RegistrationsManagementPage />;
}
