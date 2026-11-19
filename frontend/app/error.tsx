"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";

export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("app.error");
  const tCommon = useTranslations("common");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      <AlertCircle className="text-destructive size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <Button onClick={() => retry()} className="mt-2">
        {tCommon("tryAgain")}
      </Button>
    </main>
  );
}
