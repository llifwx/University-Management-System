import { describe, expect, it } from "vitest";

import { TimetableEvent, layoutDayEvents, visibleHours } from "./layout";

const event = (id: string, start: string, end: string): TimetableEvent => ({ id, sectionId: 1, day: 0, start, end, code: id, title: id, section: "A" });
const place = (...events: TimetableEvent[]) => Object.fromEntries(layoutDayEvents(events).map((p) => [p.event.id, [p.column, p.columns]]));

describe("layoutDayEvents", () => {
  it("gives a lone event the full width", () => {
    expect(place(event("a", "09:00:00", "10:00:00"))).toEqual({ a: [0, 1] });
  });
  it("keeps touching events in one column, as the backend allows them", () => {
    expect(place(event("a", "09:00:00", "10:00:00"), event("b", "10:00:00", "11:00:00"))).toEqual({ a: [0, 1], b: [0, 1] });
  });
  it("splits overlaps so neither hides the other", () => {
    expect(place(event("a", "09:00:00", "10:30:00"), event("b", "10:00:00", "11:00:00"))).toEqual({ a: [0, 2], b: [1, 2] });
  });
  it("reuses a freed column inside one overlap cluster", () => {
    expect(place(event("a", "09:00:00", "12:00:00"), event("b", "09:30:00", "10:00:00"), event("c", "10:30:00", "11:00:00"))).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2] });
  });
  it("sizes separate clusters independently", () => {
    const result = place(event("a", "09:00:00", "10:00:00"), event("b", "09:00:00", "10:00:00"), event("c", "14:00:00", "15:00:00"));
    expect(result.c).toEqual([0, 1]);
    expect(result.a[1]).toBe(2);
  });
});

describe("visibleHours", () => {
  it("shows a working day by default and stretches for outliers", () => {
    expect(visibleHours([])).toEqual({ first: 8, last: 18 });
    expect(visibleHours([event("a", "07:30:00", "20:15:00")])).toEqual({ first: 7, last: 21 });
  });
});
