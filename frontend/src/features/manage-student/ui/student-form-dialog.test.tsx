import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient } from "../../../../tests/utils";

import { StudentForm } from "./student-form-dialog";

const STUDENT = {
  student_id: 3,
  student_number: "25ID000003",
  user_id: 8,
  email: "s@example.edu",
  full_name: "Lee Sam",
  last_name: "Lee",
  first_name: "Sam",
  patronymic: null,
  program: null,
  year_level: 2,
  phone_number: null,
  photo_url: null,
  birth_date: null,
  gender: null,
  marital_status: null,
  nationality: null,
  citizenship: null,
  is_resident: true,
  personal_email: null,
  needs_dormitory: false,
  admission_year: null,
  advisor: null,
  study_form: null,
  winter_admission: null,
};

describe("StudentForm", () => {
  it("requires a 12-character password on create", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderWithClient(<StudentForm onDone={() => {}} />);
    await userEvent.type(screen.getByLabelText("Initial password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create student" }));
    expect(await screen.findByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("edits without a password field, clearing an empty program to null", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json(STUDENT));
    vi.stubGlobal("fetch", fetchMock);
    const onDone = vi.fn();
    renderWithClient(<StudentForm student={STUDENT} onDone={onDone} />);
    expect(screen.queryByLabelText("Initial password")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/students/3");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      email: "s@example.edu",
      last_name: "Lee",
      first_name: "Sam",
      program: null,
      year_level: 2,
      is_resident: true,
      needs_dormitory: false,
      patronymic: null,
      nationality: null,
      citizenship: null,
      admission_year: null,
      advisor: null,
      study_form: null,
      birth_date: null,
      personal_email: null,
      gender: null,
      marital_status: null,
      winter_admission: null,
      phone_number: null,
    });
  });

  it("explains a duplicate email", async () => {
    vi.stubGlobal("fetch", async () => apiError(409, "INTEGRITY_CONFLICT"));
    renderWithClient(<StudentForm student={STUDENT} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This email address is already in use.");
  });
});
