"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

async function logoutEverywhere() {
  const response = await fetch("/api/auth/logout?scope=all", { method: "POST" });
  if (!response.ok) throw new Error(String(response.status));
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops the query cache with the session
  window.location.assign("/login");
}

export function LogoutEverywhereButton() {
  const t = useTranslations("features.logout");
  const tCommon = useTranslations("common");
  const mutation = useMutation({ mutationFn: logoutEverywhere });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <LogOut />
          {t("everywhereButton")}
        </Button>
      }
      title={t("confirmTitle")}
      description={t("confirmDescription")}
      confirmLabel={t("everywhereButton")}
      isPending={mutation.isPending}
      error={mutation.isError ? tCommon("networkError") : undefined}
      onConfirm={() => mutation.mutate()}
    />
  );
}
