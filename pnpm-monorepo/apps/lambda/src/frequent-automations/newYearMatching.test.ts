import { describe, expect, test } from "vitest";
import { shouldGreetCitizen } from "./newYearMatching";

const candidate = (overrides: {
  timezone?: string | null;
  newYearGreetingSentAt?: Date | null;
}) => ({
  timezone: null,
  newYearGreetingSentAt: null,
  ...overrides,
});

describe("shouldGreetCitizen", () => {
  test("stays silent on an ordinary day", () => {
    expect(
      shouldGreetCitizen(candidate({}), new Date("2026-09-02T12:00:00Z")),
    ).toBe(false);
  });

  test("greets on January 1", () => {
    // 2027-01-01 01:00 in Europe/Berlin
    const now = new Date("2027-01-01T00:00:00Z");

    expect(shouldGreetCitizen(candidate({}), now)).toBe(true);
  });

  test("stays silent on the evening of December 31", () => {
    // 2026-12-31 23:30 in Europe/Berlin
    const beforeBerlinMidnight = new Date("2026-12-31T22:30:00Z");

    expect(shouldGreetCitizen(candidate({}), beforeBerlinMidnight)).toBe(false);
    expect(
      shouldGreetCitizen(
        candidate({ timezone: "Europe/Berlin" }),
        beforeBerlinMidnight,
      ),
    ).toBe(false);
  });

  test("uses the time zone of the citizen, not the one of the server", () => {
    // 2027-01-01 00:00 in Asia/Tokyo, still 2026-12-31 16:00 in Europe/Berlin
    const tokyoMidnight = new Date("2026-12-31T15:00:00Z");

    expect(
      shouldGreetCitizen(candidate({ timezone: "Asia/Tokyo" }), tokyoMidnight),
    ).toBe(true);
    expect(
      shouldGreetCitizen(
        candidate({ timezone: "Europe/Berlin" }),
        tokyoMidnight,
      ),
    ).toBe(false);

    // 2027-01-01 00:00 in Europe/Berlin, still 2026-12-31 18:00 in New York
    const berlinMidnight = new Date("2026-12-31T23:00:00Z");

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
    // 2027-01-01 00:00 in Europe/Berlin
    const berlinMidnight = new Date("2026-12-31T23:00:00Z");

    expect(shouldGreetCitizen(candidate({}), berlinMidnight)).toBe(true);
    // 2026-12-31 23:00 in Europe/Berlin, already 2027 in Asia/Tokyo
    expect(
      shouldGreetCitizen(candidate({}), new Date("2026-12-31T22:00:00Z")),
    ).toBe(false);
  });

  test("greets only once for each local year", () => {
    // 2027-01-01 13:00 in Europe/Berlin
    const now = new Date("2027-01-01T12:00:00Z");

    expect(
      shouldGreetCitizen(
        candidate({ newYearGreetingSentAt: new Date("2027-01-01T00:10:00Z") }),
        now,
      ),
    ).toBe(false);

    expect(
      shouldGreetCitizen(
        candidate({ newYearGreetingSentAt: new Date("2026-01-01T00:10:00Z") }),
        now,
      ),
    ).toBe(true);
  });

  test("does not greet twice when the citizen moves across the turn of the year", () => {
    // Greeted at the local midnight of Pacific/Kiritimati (UTC+14) …
    const greeted = candidate({
      timezone: "Pacific/Kiritimati",
      newYearGreetingSentAt: new Date("2026-12-31T10:05:00Z"),
    });

    // … and the marker still falls into 2026 after a move to Europe/Berlin
    expect(
      shouldGreetCitizen(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2027-01-01T09:00:00Z"),
      ),
    ).toBe(false);

    // The next turn of the year is a year away and is greeted again
    expect(
      shouldGreetCitizen(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2028-01-01T09:00:00Z"),
      ),
    ).toBe(true);
  });

  test("throws for a time zone the runtime does not know", () => {
    expect(() =>
      shouldGreetCitizen(
        candidate({ timezone: "Mars/Olympus_Mons" }),
        new Date("2027-01-01T12:00:00Z"),
      ),
    ).toThrow();
  });
});
