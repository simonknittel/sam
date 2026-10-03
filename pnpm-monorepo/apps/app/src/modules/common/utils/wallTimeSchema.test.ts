import { describe, expect, test } from "vitest";
import { wallTimeSchema } from "./wallTimeSchema";

describe("wall time schema", () => {
  test.each([
    ["2030-01-15T20:30", "2030-01-15T19:30:00.000Z"],
    ["2030-07-15T08:15", "2030-07-15T06:15:00.000Z"],
  ])(
    "reads %s as a wall time in the time zone of the organization",
    (wallTime, instant) => {
      expect(wallTimeSchema.parse(wallTime).toISOString()).toBe(instant);
    },
  );

  test.each([
    "2026-02-30T10:00",
    "2026-01-15T24:00",
    "2026-01-15T10:00:00",
    "2026-01-15",
    "",
  ])("gives a validation error, not an exception, for %j", (value) => {
    expect(wallTimeSchema.safeParse(value).success).toBe(false);
  });
});
