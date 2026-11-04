import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient } from "../../../../tests/utils";

import { sectionSchema } from "../model/section-schema";

import { SectionForm } from "./section-form-dialog";

const OPTIONS = {
  courses: [{ course_id: 1, course_code: "CS101", course_title: "Programming", description: null, credits: 3, created_at: "" }],
  semesters: [{ semester_id: 2, name: "Fall", start_date: "2026-09-01", end_date: "2026-12-20", is_active: true }],
  teachers: [{ id: 7, email: "t@example.edu", role: "TEACHER" as const, is_active: true }],
};
const SECTION = {
  section_id: 3,
  course_id: 1,
  semester_id: 2,
  section_number: "A",
  capacity: 10,
  teacher_id: 7,
  created_at: "",
  enrolled_count: 2,
  remaining_capacity: 8,
  meetings: [{ id: 1, meeting_day: 0, start_time: "10:00:00", end_time: "11:00:00" }],
};

describe("sectionSchema", () => {
  const valid = { course_id: 1, semester_id: 2, section_number: "A", capacity: 5, teacher_id: null, meetings: [{ meeting_day: 0, start_time: "10:00", end_time: "11:00" }] };
  it("accepts a valid section", () => {
    expect(sectionSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["end before start", { meetings: [{ meeting_day: 0, start_time: "11:00", end_time: "10:00" }] }],
    ["equal times", { meetings: [{ meeting_day: 0, start_time: "10:00", end_time: "10:00" }] }],
    ["no meetings", { meetings: [] }],
    ["zero capacity", { capacity: 0 }],
  ])("rejects %s", (_, change) => {
    expect(sectionSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe("SectionForm", () => {
  it("creates a section with several weekly meetings", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ section_id: 9 }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const onDone = vi.fn();
    renderWithClient(<SectionForm options={OPTIONS} onDone={onDone} />);

    await userEvent.selectOptions(screen.getByLabelText("Course"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Semester"), "2");
    await userEvent.type(screen.getByLabelText("Section number"), "B");
    await userEvent.type(screen.getByLabelText("Capacity"), "20");
    await userEvent.selectOptions(screen.getByLabelText("Teacher"), "7");
    await userEvent.type(document.getElementById("meeting-0-start") as HTMLElement, "09:00");
    await userEvent.type(document.getElementById("meeting-0-end") as HTMLElement, "10:30");
    await userEvent.click(screen.getByRole("button", { name: "Add meeting" }));
    await userEvent.selectOptions(document.getElementById("meeting-1-day") as HTMLElement, "2");
    await userEvent.type(document.getElementById("meeting-1-start") as HTMLElement, "09:00");
    await userEvent.type(document.getElementById("meeting-1-end") as HTMLElement, "10:30");
    await userEvent.click(screen.getByRole("button", { name: "Create section" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      course_id: 1,
      semester_id: 2,
      section_number: "B",
      capacity: 20,
      teacher_id: 7,
      meetings: [
        { meeting_day: 0, start_time: "09:00", end_time: "10:30" },
        { meeting_day: 2, start_time: "09:00", end_time: "10:30" },
      ],
    });
  });

  it("reports a meeting whose end precedes its start", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderWithClient(<SectionForm section={SECTION} options={OPTIONS} onDone={() => {}} />);
    await userEvent.clear(document.getElementById("meeting-0-end") as HTMLInputElement);
    await userEvent.type(document.getElementById("meeting-0-end") as HTMLElement, "09:00");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("The end time must be after the start time.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("omits unchanged meetings on edit, which an enrolled section would refuse", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ section_id: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<SectionForm section={SECTION} options={OPTIONS} onDone={() => {}} />);
    await userEvent.clear(screen.getByLabelText("Capacity"));
    await userEvent.type(screen.getByLabelText("Capacity"), "30");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.capacity).toBe(30);
    expect(body).not.toHaveProperty("meetings");
  });

  it("shows the backend's refusal", async () => {
    vi.stubGlobal("fetch", async () => apiError(409, "CAPACITY_BELOW_ENROLLMENT", "Capacity cannot be below enrolled count."));
    renderWithClient(<SectionForm section={SECTION} options={OPTIONS} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Capacity cannot be below enrolled count.");
  });
});
