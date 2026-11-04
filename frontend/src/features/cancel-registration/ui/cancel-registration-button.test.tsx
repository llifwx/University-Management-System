import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient } from "../../../../tests/utils";

import { CancelRegistrationButton } from "./cancel-registration-button";

describe("CancelRegistrationButton", () => {
  const openDialog = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Cancel registration" }));
    return within(await screen.findByRole("alertdialog"));
  };

  it("does nothing until confirmed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<CancelRegistrationButton registrationId={9} courseLabel="CS101" />);
    const dialog = await openDialog();
    expect(dialog.getByText(/You will leave CS101/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Keep registration" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes on confirm and refreshes affected data", async () => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit]) => json({ registration_id: 9, status: "Cancelled" }));
    vi.stubGlobal("fetch", fetchMock);
    const { invalidate } = renderWithClient(<CancelRegistrationButton registrationId={9} courseLabel="CS101" />);
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel registration" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["schedule"] }));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/registrations/9");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("keeps the dialog open with the backend's reason on failure", async () => {
    vi.stubGlobal("fetch", async () => apiError(403, "FORBIDDEN", "This registration belongs to another student."));
    renderWithClient(<CancelRegistrationButton registrationId={9} courseLabel="CS101" />);
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel registration" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("belongs to another student");
  });
});
