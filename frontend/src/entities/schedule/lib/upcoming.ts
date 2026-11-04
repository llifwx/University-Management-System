import { addDays, isAfter, parseISO, set, startOfDay } from "date-fns";

import { toMeetingDay, toMinutes } from "@/shared/lib/time";

import type { ScheduleEntry } from "../model/types";

export type UpcomingClass = { entry: ScheduleEntry; at: Date };

/** Next occurrence of each weekly meeting, kept inside the term's dates and soonest first. */
export function upcomingClasses(entries: ScheduleEntry[], term: { start_date: string; end_date: string }, now: Date = new Date(), limit = 5): UpcomingClass[] {
  const termStart = startOfDay(parseISO(term.start_date));
  const termEnd = startOfDay(parseISO(term.end_date));
  const from = isAfter(termStart, now) ? termStart : now;
  const upcoming: UpcomingClass[] = [];
  for (const entry of entries) {
    const minutes = toMinutes(entry.start_time);
    let day = addDays(startOfDay(from), (entry.meeting_day - toMeetingDay(from) + 7) % 7);
    let at = set(day, { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
    if (at < from) {
      day = addDays(day, 7);
      at = addDays(at, 7);
    }
    if (day <= termEnd) upcoming.push({ entry, at });
  }
  return upcoming.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}
