"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";

export function LogoutMenuItem() {
  const t = useTranslations("features.logout");
  const tCommon = useTranslations("common");

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
      // A full load drops every cached query along with the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
      window.location.assign("/login");
    } catch {
      toast.error(tCommon("networkError"));
    }
  }

  return (
    <DropdownMenuItem onSelect={logout}>
      <LogOut aria-hidden />
      {t("signOut")}
    </DropdownMenuItem>
  );
}
