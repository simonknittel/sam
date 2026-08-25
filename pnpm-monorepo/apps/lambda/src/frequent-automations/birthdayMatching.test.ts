import { describe, expect, test } from "vitest";
import { shouldGreetCitizen } from "./birthdayMatching";

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

describe("shouldGreetCitizen", () => {
  test("greets on the birthday", () => {
    // 2026-12-24 01:00 in Europe/Berlin
    const now = new Date("2026-12-24T00:00:00Z");

    expect(shouldGreetCitizen(candidate({}), now)).toBe(true);
  });

  test("stays silent on any other day", () => {
    const now = new Date("2026-12-23T12:00:00Z");

    expect(shouldGreetCitizen(candidate({}), now)).toBe(false);
  });

  test("stays silent for a citizen without a birthday", () => {
    const now = new Date("2026-12-24T00:00:00Z");

    expect(
      shouldGreetCitizen(
        candidate({ birthdayDay: null, birthdayMonth: null }),
        now,
      ),
    ).toBe(false);
  });

  test("uses the time zone of the citizen, not the one of the server", () => {
    // 2026-12-24 09:00 in Asia/Tokyo and 2026-12-24 01:00 in Europe/Berlin
    const now = new Date("2026-12-24T00:00:00Z");

    expect(shouldGreetCitizen(candidate({ timezone: "Asia/Tokyo" }), now)).toBe(
      true,
    );
    expect(
      shouldGreetCitizen(candidate({ timezone: "Europe/Berlin" }), now),
    ).toBe(true);

    // 2026-12-23 18:00 in America/New_York, already 2026-12-24 in Berlin
    const berlinMidnight = new Date("2026-12-24T00:00:00+01:00");

    expect(
      shouldGreetCitizen(
        candidate({ timezone: "America/New_York" }),
        berlinMidnight,
      ),
    ).toBe(false);
    expect(
      shouldGreetCitizen(
        candidate({ timezone: "Europe/Berlin" }),
        berlinMidnight,
      ),
    ).toBe(true);
  });

  test("falls back to Europe/Berlin without a time zone", () => {
    // 2026-12-23 23:30 in Europe/Berlin
    const beforeBerlinMidnight = new Date("2026-12-23T22:30:00Z");

    expect(shouldGreetCitizen(candidate({}), beforeBerlinMidnight)).toBe(false);
    expect(
      shouldGreetCitizen(
        candidate({ timezone: "Europe/Berlin" }),
        beforeBerlinMidnight,
      ),
    ).toBe(false);
  });

  test("greets a February 29 birthday on February 29 of a leap year", () => {
    const leapDay = new Date("2028-02-29T12:00:00Z");

    expect(
      shouldGreetCitizen(
        candidate({ birthdayDay: 29, birthdayMonth: 2 }),
        leapDay,
      ),
    ).toBe(true);
  });

  test("greets a February 29 birthday on March 1 of a common year", () => {
    const leapBirthday = candidate({ birthdayDay: 29, birthdayMonth: 2 });

    expect(
      shouldGreetCitizen(leapBirthday, new Date("2027-02-28T12:00:00Z")),
    ).toBe(false);
    expect(
      shouldGreetCitizen(leapBirthday, new Date("2027-03-01T12:00:00Z")),
    ).toBe(true);
  });

  test("does not move a February 29 birthday in a leap year", () => {
    expect(
      shouldGreetCitizen(
        candidate({ birthdayDay: 29, birthdayMonth: 2 }),
        new Date("2028-03-01T12:00:00Z"),
      ),
    ).toBe(false);
  });

  test("greets only once for each local year", () => {
    const now = new Date("2026-12-24T12:00:00Z");

    expect(
      shouldGreetCitizen(
        candidate({ birthdayGreetingSentAt: new Date("2026-12-24T00:10:00Z") }),
        now,
      ),
    ).toBe(false);

    expect(
      shouldGreetCitizen(
        candidate({ birthdayGreetingSentAt: new Date("2025-12-24T00:10:00Z") }),
        now,
      ),
    ).toBe(true);
  });

  test("throws for a time zone the runtime does not know", () => {
    expect(() =>
      shouldGreetCitizen(
        candidate({ timezone: "Mars/Olympus_Mons" }),
        new Date("2026-12-24T12:00:00Z"),
      ),
    ).toThrow();
  });
});
