import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TranscriptPage } from "@/pages/student-grades";

export const metadata: Metadata = { title: "Student transcript" };

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!/^\d+$/.test(studentId)) notFound();
  return <TranscriptPage studentId={Number(studentId)} />;
}
