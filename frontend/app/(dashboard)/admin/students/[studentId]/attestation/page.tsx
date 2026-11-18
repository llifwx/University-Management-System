import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttestationPage } from "@/pages/student-grades";

export const metadata: Metadata = { title: "Student attestation" };

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!/^\d+$/.test(studentId)) notFound();
  return <AttestationPage studentId={Number(studentId)} />;
}
