"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";

export default function DashboardError({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("app.dashboardError");
  const tCommon = useTranslations("common");
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center">
      <AlertCircle className="text-destructive size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <Button onClick={() => retry()} className="mt-2">
        {tCommon("tryAgain")}
      </Button>
    </div>
  );
}
