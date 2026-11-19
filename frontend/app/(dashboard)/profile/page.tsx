import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProfilePage } from "@/pages/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("profile") };
}

export default function Page() {
  return <ProfilePage />;
}
