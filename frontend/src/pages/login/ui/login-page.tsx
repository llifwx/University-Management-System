import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";

import { LoginForm } from "@/features/auth-by-email";
import { LocaleSwitcher } from "@/shared/i18n";
import { Card, CardContent } from "@/shared/ui/card";
import { FormError } from "@/shared/ui/form-field";

export function LoginPage({ next, expired, unavailable }: { next?: string; expired?: boolean; unavailable?: boolean }) {
  const tApp = useTranslations("app.root");
  const t = useTranslations("pages.login");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-3 right-3">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-xl">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{tApp("title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="space-y-4 p-6">
            {expired && <p role="status" className="bg-muted rounded-md px-3 py-2 text-sm">{t("sessionExpired")}</p>}
            {unavailable && <FormError message={t("serviceUnavailable")} />}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
