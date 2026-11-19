import { describe, expect, it } from "vitest";

import { roomSchema } from "./room-form-dialog";

describe("roomSchema", () => {
  const valid = { code: "R101", building: "Main", capacity: 40, is_active: true };
  it("accepts a valid room", () => {
    const result = roomSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(valid);
  });
  it("requires a code", () => {
    expect(roomSchema.safeParse({ ...valid, code: "  " }).success).toBe(false);
  });
  it("turns a blank building and capacity into null", () => {
    const result = roomSchema.safeParse({ ...valid, building: "  ", capacity: "" });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ building: null, capacity: null });
  });
  it("rejects a non-positive capacity", () => {
    expect(roomSchema.safeParse({ ...valid, capacity: 0 }).success).toBe(false);
  });
});
