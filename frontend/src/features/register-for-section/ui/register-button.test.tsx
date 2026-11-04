import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient } from "../../../../tests/utils";

import { RegisterButton } from "./register-button";

const clickRegister = () => userEvent.click(screen.getByRole("button", { name: "Register" }));

describe("RegisterButton", () => {
  it("posts the section and semester, then refreshes everything it affects", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ registration_id: 1 }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { invalidate } = renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/proxy/registrations");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ section_id: 4, semester_id: 2 });
    for (const queryKey of [["registrations"], ["sections"], ["schedule"]]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["SCHEDULE_CONFLICT", "This section overlaps with an existing class in your schedule."],
    ["DUPLICATE_REGISTRATION", "You are already enrolled in this section."],
    ["SECTION_FULL", "This section is full: no seats remain."],
    ["REGISTRATION_CLOSED", "Registration is closed for this semester."],
    ["SEMESTER_MISMATCH", "This section belongs to a different semester."],
  ])("explains %s", async (code, message) => {
    vi.stubGlobal("fetch", async () => apiError(409, code));
    renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("falls back to the backend's message for other codes", async () => {
    vi.stubGlobal("fetch", async () => apiError(400, "SOMETHING_NEW", "Backend explanation."));
    renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    expect(await screen.findByRole("alert")).toHaveTextContent("Backend explanation.");
  });

  it("refreshes seat counts after a failure too", async () => {
    vi.stubGlobal("fetch", async () => apiError(409, "SECTION_FULL"));
    const { invalidate } = renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["sections"] }));
  });

  it("reports network failures", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });

  it("blocks duplicate submits while pending", async () => {
    let finish = (_: Response) => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<RegisterButton sectionId={4} semesterId={2} />);
    await clickRegister();
    const pending = await screen.findByRole("button", { name: "Registering…" });
    expect(pending).toBeDisabled();
    await userEvent.click(pending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(json({ registration_id: 1 }, 201));
  });

  it("can be disabled by the caller", () => {
    renderWithClient(<RegisterButton sectionId={4} semesterId={2} disabled label="Section full" />);
    expect(screen.getByRole("button", { name: "Section full" })).toBeDisabled();
  });
});
