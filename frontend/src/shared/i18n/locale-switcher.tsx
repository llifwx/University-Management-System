"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { localeLabels } from "./config";
import { useLocaleSwitch } from "./use-locale-switch";

/** The menu items only, for embedding inside an already-open dropdown (e.g. the app shell's account menu). */
export function LocaleMenuItems() {
  const t = useTranslations("common");
  const { locale, locales, switchTo } = useLocaleSwitch();
  return (
    <>
      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">{t("language")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={locale} onValueChange={(value) => switchTo(value as typeof locale)}>
        {locales.map((value) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {localeLabels[value]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}

/** A standalone switcher with its own trigger, for places with no account menu to live in (e.g. the login page). */
export function LocaleSwitcher() {
  const t = useTranslations("common");
  const { locale, locales, switchTo } = useLocaleSwitch();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("language")}>
          <Languages aria-hidden />
          {localeLabels[locale]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => switchTo(value as typeof locale)}>
          {locales.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {localeLabels[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
