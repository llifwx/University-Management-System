import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminDashboardPage } from "@/pages/admin-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("admin") };
}

export default function Page() {
  return <AdminDashboardPage />;
}
