import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TeacherSectionPage } from "@/pages/teacher-dashboard";

export const metadata: Metadata = { title: "Section details" };

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  if (!/^\d+$/.test(sectionId)) notFound();
  return <TeacherSectionPage sectionId={Number(sectionId)} />;
}
