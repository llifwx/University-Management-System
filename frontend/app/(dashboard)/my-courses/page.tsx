import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { MyCoursesPage } from "@/pages/my-courses";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("myCourses") };
}

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <MyCoursesPage /> : <ForbiddenPage />;
}
