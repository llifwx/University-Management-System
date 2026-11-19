import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { TeacherSectionPage } from "@/pages/teacher-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("sectionDetails") };
}

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  if (!/^\d+$/.test(sectionId)) notFound();
  return <TeacherSectionPage sectionId={Number(sectionId)} />;
}
