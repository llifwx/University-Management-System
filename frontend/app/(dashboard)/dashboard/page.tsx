import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { roleHome } from "@/entities/user";
import { requireUser } from "@/entities/user/server";
import { StudentDashboardPage } from "@/pages/student-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("dashboard") };
}

export default async function Page() {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect(roleHome(user.role));
  return <StudentDashboardPage />;
}
