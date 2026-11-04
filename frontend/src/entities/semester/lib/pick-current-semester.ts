import { format } from "date-fns";

import type { Semester } from "../model/types";

/**
 * The backend has no "current semester": several can be active at once. Prefer an active term containing
 * today, then the next active one, then the most recent term of any kind.
 */
export function pickCurrentSemester(semesters: Semester[], today: Date = new Date()): Semester | undefined {
  const date = format(today, "yyyy-MM-dd");
  const byStart = [...semesters].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const active = byStart.filter((s) => s.is_active);
  return (
    active.find((s) => s.start_date <= date && date <= s.end_date) ??
    active.find((s) => s.start_date > date) ??
    active.at(-1) ??
    byStart.at(-1)
  );
}
