import { describe, expect, it, vi } from "vitest";

import { apiError, json, stubLocation } from "../../../tests/utils";

import { apiRequest, fetchAllPages } from "./client";
import { ApiError, applyFieldErrors, getErrorMessage, NETWORK_ERROR_MESSAGE } from "./errors";

describe("apiRequest", () => {
  it("calls the BFF, not FastAPI, and skips empty query values", async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/sections", { query: { semester_id: 2, teacher_id: undefined } });
    expect(fetchMock.mock.calls[0]).toEqual(expect.arrayContaining(["/api/proxy/sections?semester_id=2"]));
  });

  it("turns the backend error envelope into ApiError", async () => {
    vi.stubGlobal("fetch", async () => apiError(409, "SECTION_FULL", "No seats remain."));
    await expect(apiRequest("/registrations", { method: "POST", json: {} })).rejects.toMatchObject({ status: 409, code: "SECTION_FULL", message: "No seats remain." });
  });

  it("sends the browser to login when the session has ended", async () => {
    const assign = stubLocation("/my-courses");
    vi.stubGlobal("fetch", async () => apiError(401, "SESSION_EXPIRED"));
    await expect(apiRequest("/registrations/me")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/login?expired=1&next=%2Fmy-courses");
  });
});

describe("fetchAllPages", () => {
  it("walks the backend's offset pagination until total", async () => {
    const offsets: (string | null)[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      const params = new URL(url, "http://app.test").searchParams;
      offsets.push(params.get("offset"));
      expect(params.get("limit")).toBe("100");
      const offset = Number(params.get("offset"));
      return json({ items: offset === 0 ? Array(100).fill(1) : [2, 3], total: 102, offset, limit: 100 });
    });
    await expect(fetchAllPages("/courses")).resolves.toHaveLength(102);
    expect(offsets).toEqual(["0", "100"]);
  });

  it("stops if rows vanish while paging", async () => {
    vi.stubGlobal("fetch", async () => json({ items: [], total: 5, offset: 0, limit: 100 }));
    await expect(fetchAllPages("/courses")).resolves.toEqual([]);
  });
});

describe("error helpers", () => {
  it("prefers a code-specific message, then the backend's, and never exposes a TypeError", () => {
    const error = new ApiError(409, "SCHEDULE_CONFLICT", "Backend text");
    expect(getErrorMessage(error, { SCHEDULE_CONFLICT: "Mapped" })).toBe("Mapped");
    expect(getErrorMessage(error)).toBe("Backend text");
    expect(getErrorMessage(new TypeError("fetch failed"))).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("maps FastAPI 422 locations onto form fields", () => {
    const setError = vi.fn();
    const error = new ApiError(422, "VALIDATION_ERROR", "Invalid", [{ location: ["body", "email"], message: "bad email" }]);
    expect(applyFieldErrors(error, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith("email", { message: "bad email" });
    expect(applyFieldErrors(new ApiError(409, "X", "Y"), setError)).toBe(false);
  });
});
