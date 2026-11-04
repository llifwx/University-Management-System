import { describe, expect, it } from "vitest";

import { pickCurrentSemester } from "./pick-current-semester";

const term = (semester_id: number, start_date: string, end_date: string, is_active = true) => ({ semester_id, name: `T${semester_id}`, start_date, end_date, is_active });
const FALL = term(1, "2026-09-01", "2026-12-20");
const SPRING = term(2, "2027-01-15", "2027-05-25");

describe("pickCurrentSemester", () => {
  it("prefers the active term containing today, even with several active", () => {
    expect(pickCurrentSemester([SPRING, FALL], new Date(2026, 10, 4))).toBe(FALL);
  });
  it("falls forward to the next active term between terms", () => {
    expect(pickCurrentSemester([FALL, SPRING], new Date(2027, 0, 2))).toBe(SPRING);
  });
  it("ignores a closed term containing today", () => {
    const closed = { ...FALL, is_active: false };
    expect(pickCurrentSemester([closed, SPRING], new Date(2026, 10, 4))).toBe(SPRING);
  });
  it("falls back to the latest term, and to nothing without terms", () => {
    expect(pickCurrentSemester([{ ...FALL, is_active: false }, { ...SPRING, is_active: false }], new Date(2030, 0, 1))?.semester_id).toBe(2);
    expect(pickCurrentSemester([])).toBeUndefined();
  });
});
