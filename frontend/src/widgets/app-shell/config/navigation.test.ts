import { describe, expect, it } from "vitest";

import { NAVIGATION, isActiveLink } from "./navigation";

describe("navigation", () => {
  it("only offers each role its own area", () => {
    const hrefs = (role: keyof typeof NAVIGATION) => NAVIGATION[role].map((item) => item.href);
    expect(hrefs("STUDENT")).not.toContainEqual(expect.stringMatching(/^\/(admin|teacher)/));
    expect(hrefs("TEACHER")).not.toContainEqual(expect.stringMatching(/^\/(admin|my-courses)/));
    expect(hrefs("ADMIN")).not.toContainEqual(expect.stringMatching(/^\/(teacher|my-courses)/));
  });
  it("does not light up the home link on nested pages", () => {
    expect(isActiveLink("/admin/courses", "/admin")).toBe(false);
    expect(isActiveLink("/admin", "/admin")).toBe(true);
    expect(isActiveLink("/courses/4", "/courses")).toBe(true);
  });
});
