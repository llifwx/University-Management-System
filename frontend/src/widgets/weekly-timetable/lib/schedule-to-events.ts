import type { useTranslations } from "next-intl";

import { instructorLabel } from "@/entities/course-section";
import type { ScheduleEntry } from "@/entities/schedule";

import type { TimetableEvent } from "./layout";

/** `t` must be scoped to `entities.courseSection` (e.g. `useTranslations("entities.courseSection")`) — the namespace `instructorLabel` reads from. */
export function scheduleToEvents(t: ReturnType<typeof useTranslations>, entries: ScheduleEntry[]): TimetableEvent[] {
  return entries.map((entry) => ({
    id: `${entry.registration_id}-${entry.meeting_day}-${entry.start_time}`,
    sectionId: entry.section_id,
    day: entry.meeting_day,
    start: entry.start_time,
    end: entry.end_time,
    code: entry.course_code,
    title: entry.course_title,
    section: entry.section_number,
    instructor: instructorLabel(t, entry),
    room: entry.room_code ?? undefined,
  }));
}
