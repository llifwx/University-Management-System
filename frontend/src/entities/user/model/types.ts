import type { useTranslations } from "next-intl";

import type { components } from "@/shared/api";

export type User = components["schemas"]["UserOut"];
export type Role = User["role"];

export function roleHome(role: Role): string {
  return { STUDENT: "/dashboard", TEACHER: "/teacher", ADMIN: "/admin" }[role];
}

export function roleLabels(t: ReturnType<typeof useTranslations>): Record<Role, string> {
  return { STUDENT: t("role.student"), TEACHER: t("role.teacher"), ADMIN: t("role.admin") };
}
