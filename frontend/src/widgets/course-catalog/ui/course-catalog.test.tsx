import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiError, renderWithClient, stubApi } from "../../../../tests/utils";

import { CourseCatalog } from "./course-catalog";

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/courses",
  useSearchParams: () => params,
}));

const course = (course_id: number, course_code: string, course_title: string) => ({ course_id, course_code, course_title, description: null, credits: 3, created_at: "2026-01-01T00:00:00Z" });
const section = (section_id: number, course_id: number, semester_id: number, remaining_capacity = 5) => ({
  section_id,
  course_id,
  semester_id,
  section_number: "A",
  capacity: 25,
  teacher_id: 1,
  created_at: "2026-01-01T00:00:00Z",
  meetings: [],
  enrolled_count: 25 - remaining_capacity,
  remaining_capacity,
});
const SEMESTERS = [
  { semester_id: 1, name: "Fall 2026", start_date: "2026-09-01", end_date: "2026-12-20", is_active: true },
  { semester_id: 2, name: "Spring 2027", start_date: "2027-01-15", end_date: "2027-05-25", is_active: false },
];
const COURSES = [course(1, "CS101", "Programming"), course(2, "IS201", "Databases"), course(3, "MA101", "Mathematics")];

function setup(sections = [section(10, 1, 1), section(11, 1, 1, 2), section(12, 2, 2)]) {
  stubApi({ "GET /api/proxy/semesters": SEMESTERS, "GET /api/proxy/courses": COURSES, "GET /api/proxy/sections": sections });
  renderWithClient(<CourseCatalog />);
}

describe("CourseCatalog", () => {
  beforeEach(() => {
    replace.mockReset();
    params = new URLSearchParams("semester=all");
  });

  it("lists courses with a section summary and a details link", async () => {
    setup();
    const link = await screen.findByRole("link", { name: "Programming" });
    expect(link).toHaveAttribute("href", "/courses/1");
    const card = link.closest("li") as HTMLElement;
    expect(within(card).getByText("CS101")).toBeInTheDocument();
    expect(within(card).getByText("2 sections · 7 seats left")).toBeInTheDocument();
    expect(screen.getByText("No sections listed")).toBeInTheDocument();
  });

  it.each([
    ["data", "Databases"],
    ["IS2", "Databases"],
  ])("searches name and code: %s", async (term, title) => {
    setup();
    await screen.findByRole("link", { name: "Programming" });
    await userEvent.type(screen.getByLabelText("Search"), term);
    expect(screen.getByRole("link", { name: title })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Programming" })).toBeNull();
  });

  it("shows an empty state for no matches", async () => {
    setup();
    await screen.findByRole("link", { name: "Programming" });
    await userEvent.type(screen.getByLabelText("Search"), "zzz");
    expect(screen.getByText("No courses found")).toBeInTheDocument();
  });

  it("limits to courses with sections in the chosen semester, sending the filter to the API", async () => {
    params = new URLSearchParams("semester=2");
    setup([section(12, 2, 2)]);
    expect(await screen.findByRole("link", { name: "Databases" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Programming" })).toBeNull();
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("/sections?semester_id=2"))).toBe(true);
  });

  it("keeps the semester in the URL", async () => {
    setup();
    await screen.findByRole("link", { name: "Programming" });
    await userEvent.selectOptions(screen.getByLabelText("Semester"), "Spring 2027 (closed)");
    expect(replace).toHaveBeenCalledWith("/courses?semester=2", { scroll: false });
  });

  it("defaults to the current semester", async () => {
    params = new URLSearchParams();
    setup();
    await waitFor(() => expect(screen.getByLabelText("Semester")).toHaveDisplayValue("Fall 2026"));
  });

  it("asks the API for available sections only", async () => {
    setup();
    await screen.findByRole("link", { name: "Programming" });
    await userEvent.click(screen.getByRole("switch", { name: "Seats available" }));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("available_only=true"))).toBe(true));
  });

  it("surfaces load failures with a retry", async () => {
    stubApi({ "GET /api/proxy/semesters": SEMESTERS, "GET /api/proxy/courses": () => apiError(503, "DATABASE_UNAVAILABLE", "Database request failed."), "GET /api/proxy/sections": [] });
    renderWithClient(<CourseCatalog />);
    expect(await screen.findByText("Database request failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
