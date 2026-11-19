export const locales = ["ru", "kk", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export const localeCookieName = "NEXT_LOCALE";

export const localeLabels: Record<Locale, string> = {
  ru: "Русский",
  kk: "Қазақша",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
