import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TimetableEvent } from "../lib/layout";

import { WeeklyTimetable } from "./weekly-timetable";

const meeting = (id: string, day: number, start = "10:00:00", end = "11:30:00"): TimetableEvent => ({
  id,
  sectionId: 1,
  day,
  start,
  end,
  code: "CS101",
  title: "Programming",
  section: "A",
  instructor: "Instructor #7",
});

describe("WeeklyTimetable", () => {
  it("draws every meeting of a multi-meeting section on its own day", () => {
    render(<WeeklyTimetable events={[meeting("m1", 0), meeting("m2", 2)]} />);
    const grid = screen.getByTestId("week-grid");
    expect(within(grid.querySelector('[data-day="Monday"]') as HTMLElement).getByRole("button")).toHaveAccessibleName(/Monday 10:00 to 11:30/);
    expect(within(grid.querySelector('[data-day="Wednesday"]') as HTMLElement).getByRole("button")).toBeInTheDocument();
    expect(within(grid.querySelector('[data-day="Tuesday"]') as HTMLElement).queryByRole("button")).toBeNull();
  });

  it("positions events by time", () => {
    render(<WeeklyTimetable events={[meeting("m1", 0, "10:00:00", "11:30:00")]} />);
    const block = within(screen.getByTestId("week-grid")).getByRole("button");
    expect(block).toHaveStyle({ top: "112px", height: "82px" }); // 2h after 08:00, 1.5h tall, minus the 2px gap.
  });

  it("renders overlapping events side by side, hiding neither", () => {
    render(<WeeklyTimetable events={[meeting("m1", 1), meeting("m2", 1, "10:30:00", "12:00:00")]} />);
    const blocks = within(screen.getByTestId("week-grid")).getAllByRole("button");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].style.width).toContain("50%");
    expect(blocks[1].style.left).toContain("50%");
  });

  it("offers a day-based view that starts on today and can switch", async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 4), toFake: ["Date"] }); // A Wednesday.
    render(<WeeklyTimetable events={[meeting("m1", 2)]} />);
    vi.useRealTimers();
    const view = within(screen.getByTestId("day-view"));
    expect(view.getByRole("button", { name: "Wednesday" })).toHaveAttribute("aria-pressed", "true");
    expect(view.getByText(/CS101 · Programming/)).toBeInTheDocument();
    await userEvent.click(view.getByRole("button", { name: "Friday" }));
    expect(view.getByText("No classes on Friday.")).toBeInTheDocument();
  });

  it("opens details with the instructor", async () => {
    render(<WeeklyTimetable events={[meeting("m1", 0)]} />);
    await userEvent.click(within(screen.getByTestId("week-grid")).getByRole("button"));
    expect(within(await screen.findByRole("dialog")).getByText("Instructor #7")).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty grid", () => {
    render(<WeeklyTimetable events={[]} emptyMessage="Nothing this term." />);
    expect(screen.getByText("Nothing this term.")).toBeInTheDocument();
    expect(screen.queryByTestId("week-grid")).toBeNull();
  });
});
