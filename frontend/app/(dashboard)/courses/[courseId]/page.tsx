import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CourseDetailsPage } from "@/pages/course-details";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("courseDetails") };
}

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!/^\d+$/.test(courseId)) notFound();
  return <CourseDetailsPage courseId={Number(courseId)} />;
}
