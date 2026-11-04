import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { apiError, json, renderWithClient, stubLocation } from "../../../../tests/utils";

import { LoginForm } from "./login-form";

async function submit(email = "a@example.edu", password = "secret") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("validates before calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["STUDENT", "/dashboard"],
    ["TEACHER", "/teacher"],
    ["ADMIN", "/admin"],
  ])("sends a %s to %s", async (role, target) => {
    const assign = stubLocation();
    vi.stubGlobal("fetch", async () => json({ id: 1, email: "a@example.edu", role, is_active: true }));
    renderWithClient(<LoginForm />);
    await submit();
    await waitFor(() => expect(assign).toHaveBeenCalledWith(target));
  });

  it("honours a safe return path and ignores an unsafe one", async () => {
    const assign = stubLocation();
    vi.stubGlobal("fetch", async () => json({ id: 1, email: "a@example.edu", role: "STUDENT", is_active: true }));
    const { unmount } = renderWithClient(<LoginForm next="/my-courses" />);
    await submit();
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith("/my-courses"));
    unmount();
    renderWithClient(<LoginForm next="//evil.example" />);
    await submit();
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith("/dashboard"));
  });

  it("shows invalid credentials and allows another try", async () => {
    vi.stubGlobal("fetch", async () => apiError(401, "INVALID_CREDENTIALS"));
    renderWithClient(<LoginForm />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("disables the button while signing in, preventing double submits", async () => {
    let finish = (_: Response) => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    stubLocation();
    renderWithClient(<LoginForm />);
    await submit();
    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(json({ id: 1, role: "STUDENT" }));
  });

  it("toggles password visibility", async () => {
    renderWithClient(<LoginForm />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("explains an unreachable server", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("failed");
    });
    renderWithClient(<LoginForm />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });
});
