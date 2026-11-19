import { kk, ru, type Locale as DateFnsLocale } from "date-fns/locale";
import { useLocale } from "next-intl";

import type { Locale } from "./config";

const dateFnsLocales: Partial<Record<Locale, DateFnsLocale>> = { ru, kk };

/** date-fns has no "en" entry to pass here — undefined falls back to its built-in English formatting. */
export function useDateFnsLocale(): DateFnsLocale | undefined {
  return dateFnsLocales[useLocale() as Locale];
}
