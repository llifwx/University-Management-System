import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectionGradesPage } from "@/pages/section-management";

export const metadata: Metadata = { title: "Section grades" };

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  if (!/^\d+$/.test(sectionId)) notFound();
  return <SectionGradesPage sectionId={Number(sectionId)} />;
}
