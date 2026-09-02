import { isBirthdayToday } from "@sam-monorepo/domain";
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
      shouldGreetCitizen(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2026-01-01T09:00:00Z"),
      ),
    ).toBe(false);

    // The next birthday is a year away and is greeted again
    expect(
      shouldGreetCitizen(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2027-01-01T09:00:00Z"),
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

/**
 * The shared rule behind both the greeting of this Lambda and the party hat
 * of the app. The domain package has no test runner of its own, thus its
 * cases live next to the job which was the first consumer of the rule.
 */
describe("isBirthdayToday", () => {
  test("celebrates the birthday on the local day of the citizen", () => {
    expect(
      isBirthdayToday(
        { timezone: "Asia/Tokyo", birthdayDay: 24, birthdayMonth: 12 },
        // 2026-12-24 09:00 in Asia/Tokyo
        new Date("2026-12-24T00:00:00Z"),
      ),
    ).toBe(true);
  });

  test("reads the same moment on both sides of a day boundary", () => {
    // 2026-12-24 00:30 in Europe/Berlin and 2026-12-23 18:30 in New York
    const afterBerlinMidnight = new Date("2026-12-23T23:30:00Z");
    const birthday = { birthdayDay: 24, birthdayMonth: 12 };

    expect(
      isBirthdayToday(
        { ...birthday, timezone: "Europe/Berlin" },
        afterBerlinMidnight,
      ),
    ).toBe(true);
    expect(
      isBirthdayToday(
        { ...birthday, timezone: "America/New_York" },
        afterBerlinMidnight,
      ),
    ).toBe(false);
  });

  test("falls back to the time zone of the organization", () => {
    const birthday = { timezone: null, birthdayDay: 24, birthdayMonth: 12 };

    // 2026-12-23 23:30 in Europe/Berlin
    expect(isBirthdayToday(birthday, new Date("2026-12-23T22:30:00Z"))).toBe(
      false,
    );
    // 2026-12-24 00:30 in Europe/Berlin
    expect(isBirthdayToday(birthday, new Date("2026-12-23T23:30:00Z"))).toBe(
      true,
    );
  });

  test("moves a February 29 birthday to March 1 of a common year", () => {
    const leapBirthday = { timezone: null, birthdayDay: 29, birthdayMonth: 2 };

    expect(
      isBirthdayToday(leapBirthday, new Date("2027-02-28T12:00:00Z")),
    ).toBe(false);
    expect(
      isBirthdayToday(leapBirthday, new Date("2027-03-01T12:00:00Z")),
    ).toBe(true);
    expect(
      isBirthdayToday(leapBirthday, new Date("2028-02-29T12:00:00Z")),
    ).toBe(true);
  });

  test("stays silent for a citizen without a birthday", () => {
    expect(
      isBirthdayToday(
        { timezone: null, birthdayDay: null, birthdayMonth: null },
        new Date("2026-12-24T12:00:00Z"),
      ),
    ).toBe(false);
  });

  test("throws for a time zone the runtime does not know", () => {
    expect(() =>
      isBirthdayToday(
        { timezone: "Mars/Olympus_Mons", birthdayDay: 24, birthdayMonth: 12 },
        new Date("2026-12-24T12:00:00Z"),
      ),
    ).toThrow();
  });
});
