import { describe, expect, it } from "vitest";

import type { ScheduleEntry } from "../model/types";

import { upcomingClasses } from "./upcoming";

const entry = (meeting_day: number, start_time: string): ScheduleEntry => ({
  registration_id: 1,
  section_id: 1,
  course_code: "CS101",
  course_title: "Intro",
  section_number: "A",
  teacher_id: null,
  meeting_day,
  start_time,
  end_time: "23:00:00",
});
const TERM = { start_date: "2026-09-01", end_date: "2026-12-20" };
const WEDNESDAY_NOON = new Date(2026, 10, 4, 12, 0);

describe("upcomingClasses", () => {
  it("orders the next occurrence of each meeting", () => {
    const result = upcomingClasses([entry(0, "09:00:00"), entry(2, "14:00:00"), entry(4, "09:00:00")], TERM, WEDNESDAY_NOON);
    expect(result.map((item) => item.at)).toEqual([new Date(2026, 10, 4, 14, 0), new Date(2026, 10, 6, 9, 0), new Date(2026, 10, 9, 9, 0)]);
  });
  it("rolls a class already started today to next week", () => {
    expect(upcomingClasses([entry(2, "09:00:00")], TERM, WEDNESDAY_NOON)[0].at).toEqual(new Date(2026, 10, 11, 9, 0));
  });
  it("starts from the term start for a future term", () => {
    expect(upcomingClasses([entry(0, "09:00:00")], { start_date: "2027-01-15", end_date: "2027-05-25" }, WEDNESDAY_NOON)[0].at).toEqual(new Date(2027, 0, 18, 9, 0));
  });
  it("drops classes past the end of the term", () => {
    expect(upcomingClasses([entry(0, "09:00:00")], TERM, new Date(2026, 11, 20, 12, 0))).toEqual([]);
  });
});
