import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { TranscriptPage } from "@/pages/student-grades";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("transcript") };
}

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <TranscriptPage /> : <ForbiddenPage />;
}
