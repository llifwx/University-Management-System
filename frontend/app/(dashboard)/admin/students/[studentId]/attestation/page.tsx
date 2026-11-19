import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AttestationPage } from "@/pages/student-grades";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("studentAttestation") };
}

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!/^\d+$/.test(studentId)) notFound();
  return <AttestationPage studentId={Number(studentId)} />;
}
