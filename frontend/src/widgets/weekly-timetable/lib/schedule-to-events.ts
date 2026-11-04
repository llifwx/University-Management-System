import { instructorLabel } from "@/entities/course-section";
import type { ScheduleEntry } from "@/entities/schedule";

import type { TimetableEvent } from "./layout";

export function scheduleToEvents(entries: ScheduleEntry[]): TimetableEvent[] {
  return entries.map((entry) => ({
    id: `${entry.registration_id}-${entry.meeting_day}-${entry.start_time}`,
    sectionId: entry.section_id,
    day: entry.meeting_day,
    start: entry.start_time,
    end: entry.end_time,
    code: entry.course_code,
    title: entry.course_title,
    section: entry.section_number,
    instructor: instructorLabel(entry.teacher_id),
  }));
}
