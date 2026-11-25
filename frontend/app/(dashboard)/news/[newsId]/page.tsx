import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { NewsDetailsPage } from "@/pages/news";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.titles");
  return { title: t("news") };
}

export default async function Page({ params }: { params: Promise<{ newsId: string }> }) {
  const { newsId } = await params;
  if (!/^\d+$/.test(newsId)) notFound();
  const user = await requireUser();
  return user.role === "TEACHER" ? <ForbiddenPage /> : <NewsDetailsPage newsId={Number(newsId)} />;
}
