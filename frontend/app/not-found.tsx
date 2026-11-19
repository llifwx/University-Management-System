import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("app.titles"))("notFoundTitle") };
}

export default function NotFound() {
  const t = useTranslations("app.notFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      <FileQuestion className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <Button asChild className="mt-2">
        <Link href="/">{t("action")}</Link>
      </Button>
    </main>
  );
}
