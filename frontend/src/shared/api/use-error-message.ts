"use client";

import { useTranslations } from "next-intl";

import { getErrorMessage } from "./errors";

/** Translates an ApiError's code via the shared `errors.*` dictionary, with optional per-call overrides. */
export function useApiErrorMessage() {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  return (error: unknown, byCode: Record<string, string> = {}) => getErrorMessage(error, t.has, t, tCommon("networkError"), byCode);
}
