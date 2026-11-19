import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SectionGradesPage } from "@/pages/section-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("sectionGrades") };
}

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  if (!/^\d+$/.test(sectionId)) notFound();
  return <SectionGradesPage sectionId={Number(sectionId)} />;
}
