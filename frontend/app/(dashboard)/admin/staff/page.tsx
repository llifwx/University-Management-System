import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StaffManagementPage } from "@/pages/staff-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("adminStaff") };
}

export default function Page() {
  return <StaffManagementPage />;
}
