import { describe, expect, test } from "vitest";
import { shouldGreetOnBirthday } from "./birthdayGreetingRule.js";

const candidate = (overrides: {
  timezone?: string | null;
  birthdayDay?: number | null;
  birthdayMonth?: number | null;
  birthdayGreetingSentAt?: Date | null;
}) => ({
  timezone: null,
  birthdayDay: 24,
  birthdayMonth: 12,
  birthdayGreetingSentAt: null,
  ...overrides,
});

describe("shouldGreetOnBirthday", () => {
  test("greets only once for each local year", () => {
    const now = new Date("2026-12-24T12:00:00Z");

    expect(
      shouldGreetOnBirthday(
        candidate({ birthdayGreetingSentAt: new Date("2026-12-24T00:10:00Z") }),
        now,
      ),
    ).toBe(false);

    expect(
      shouldGreetOnBirthday(
        candidate({ birthdayGreetingSentAt: new Date("2025-12-24T00:10:00Z") }),
        now,
      ),
    ).toBe(true);
  });

  test("does not greet twice when the citizen moves across the turn of the year", () => {
    // Greeted at the local midnight of Pacific/Kiritimati (UTC+14) …
    const greeted = candidate({
      timezone: "Pacific/Kiritimati",
      birthdayDay: 1,
      birthdayMonth: 1,
      birthdayGreetingSentAt: new Date("2025-12-31T10:05:00Z"),
    });

    // … and the marker still falls into 2025 after a move to Europe/Berlin
    expect(
      shouldGreetOnBirthday(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2026-01-01T09:00:00Z"),
      ),
    ).toBe(false);

    expect(
      shouldGreetOnBirthday(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2027-01-01T09:00:00Z"),
      ),
    ).toBe(true);
  });
});
