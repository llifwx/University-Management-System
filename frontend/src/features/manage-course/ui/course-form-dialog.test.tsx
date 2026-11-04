import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient } from "../../../../tests/utils";

import { CourseForm } from "./course-form-dialog";

async function fill(code = "CS900", title = "Compilers", credits = "4") {
  await userEvent.type(screen.getByLabelText("Course code"), code);
  await userEvent.type(screen.getByLabelText("Title"), title);
  await userEvent.type(screen.getByLabelText("Credits"), credits);
}
const save = (name = "Create course") => userEvent.click(screen.getByRole("button", { name }));

describe("CourseForm", () => {
  it("validates required fields and credit range", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<CourseForm onDone={() => {}} />);
    await save();
    expect(await screen.findByText("Enter a course code.")).toBeInTheDocument();
    expect(screen.getByText("Enter the credits.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Credits"), "99");
    await save();
    expect(await screen.findByText("Credits must be between 1 and 30.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates, sending a null description when blank", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ course_id: 5 }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const onDone = vi.fn();
    const { invalidate } = renderWithClient(<CourseForm onDone={onDone} />);
    await fill();
    await save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/proxy/courses");
    expect(JSON.parse(String(init.body))).toEqual({ course_code: "CS900", course_title: "Compilers", credits: 4, description: null });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["courses"] });
  });

  it("edits with PATCH", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ course_id: 5 }));
    vi.stubGlobal("fetch", fetchMock);
    const course = { course_id: 5, course_code: "CS1", course_title: "Old", description: "Text", credits: 3, created_at: "" };
    renderWithClient(<CourseForm course={course} onDone={() => {}} />);
    expect(screen.getByLabelText("Title")).toHaveValue("Old");
    await save("Save changes");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/courses/5");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });

  it("shows conflicts and places 422 details on fields", async () => {
    const responses = [apiError(409, "INTEGRITY_CONFLICT"), json({ error: { code: "VALIDATION_ERROR", message: "Invalid.", details: [{ location: ["body", "course_title"], message: "Too long per backend" }] } }, 422)];
    vi.stubGlobal("fetch", async () => responses.shift());
    renderWithClient(<CourseForm onDone={() => {}} />);
    await fill();
    await save();
    expect(await screen.findByText("A course with this code already exists.")).toBeInTheDocument();
    await save();
    expect(await screen.findByText("Too long per backend")).toBeInTheDocument();
  });
});
