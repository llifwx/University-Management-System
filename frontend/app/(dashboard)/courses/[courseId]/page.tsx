import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseDetailsPage } from "@/pages/course-details";

export const metadata: Metadata = { title: "Course details" };

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!/^\d+$/.test(courseId)) notFound();
  return <CourseDetailsPage courseId={Number(courseId)} />;
}
