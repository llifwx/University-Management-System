import type { useTranslations } from "next-intl";

/** Teachers without a profile name yet fall back to their id; /users is admin-only. */
export function instructorLabel(
  t: ReturnType<typeof useTranslations>,
  { teacher_id, teacher_name }: { teacher_id: number | null; teacher_name?: string | null },
): string {
  if (teacher_id === null) return t("unassigned");
  return teacher_name ?? t("instructorNumber", { id: teacher_id });
}
