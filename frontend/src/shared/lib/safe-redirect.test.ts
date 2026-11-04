import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/courses/3?semester=1")).toBe("/courses/3?semester=1");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "evil", "", null, undefined])("rejects %j", (value) => {
    expect(safeRedirectPath(value, "/home")).toBe("/home");
  });
});
