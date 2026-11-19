import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

export function ForbiddenPage() {
  const t = useTranslations("pages.forbidden");
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <ShieldAlert className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground max-w-md text-sm">{t("description")}</p>
      <Button asChild className="mt-2">
        <Link href="/">{t("backToDashboard")}</Link>
      </Button>
    </div>
  );
}
