import { describe, expect, it } from "vitest";

import { semesterSchema } from "./semester-form-dialog";

describe("semesterSchema", () => {
  const valid = { name: "Fall", start_date: "2026-09-01", end_date: "2026-12-20", is_active: true };
  it("accepts a valid term", () => {
    expect(semesterSchema.safeParse(valid).success).toBe(true);
  });
  it("requires the end after the start", () => {
    const result = semesterSchema.safeParse({ ...valid, end_date: "2026-09-01" });
    expect(result.error?.issues[0].path).toEqual(["end_date"]);
  });
  it("requires dates and a name", () => {
    expect(semesterSchema.safeParse({ ...valid, start_date: "" }).success).toBe(false);
    expect(semesterSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });
});
