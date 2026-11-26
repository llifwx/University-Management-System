import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/entities/user/server";
import { StudentAttendancePage } from "@/pages/attendance";
import { ForbiddenPage } from "@/pages/forbidden";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("attendance") };
}

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <StudentAttendancePage /> : <ForbiddenPage />;
}
