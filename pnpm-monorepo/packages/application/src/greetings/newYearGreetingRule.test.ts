import { describe, expect, test } from "vitest";
import { shouldGreetForNewYear } from "./newYearGreetingRule.js";

const candidate = (overrides: {
  timezone?: string | null;
  newYearGreetingSentAt?: Date | null;
}) => ({
  timezone: null,
  newYearGreetingSentAt: null,
  ...overrides,
});

describe("shouldGreetForNewYear", () => {
  test("stays silent on an ordinary day", () => {
    expect(
      shouldGreetForNewYear(candidate({}), new Date("2026-09-02T12:00:00Z")),
    ).toBe(false);
  });

  test("greets on January 1", () => {
    // 2027-01-01 01:00 in Europe/Berlin
    const now = new Date("2027-01-01T00:00:00Z");

    expect(shouldGreetForNewYear(candidate({}), now)).toBe(true);
  });

  /**
   * The New Year theme of the app starts on December 27 already. The
   * greeting keeps to the greeting day of the event.
   */
  test("stays silent on the theme days before January 1", () => {
    // 2026-12-27 12:00 in Europe/Berlin
    expect(
      shouldGreetForNewYear(candidate({}), new Date("2026-12-27T11:00:00Z")),
    ).toBe(false);
    // 2026-12-29 12:00 in Europe/Berlin
    expect(
      shouldGreetForNewYear(candidate({}), new Date("2026-12-29T11:00:00Z")),
    ).toBe(false);
  });

  test("stays silent on the evening of December 31", () => {
    // 2026-12-31 23:30 in Europe/Berlin
    const beforeBerlinMidnight = new Date("2026-12-31T22:30:00Z");

    expect(shouldGreetForNewYear(candidate({}), beforeBerlinMidnight)).toBe(
      false,
    );
    expect(
      shouldGreetForNewYear(
        candidate({ timezone: "Europe/Berlin" }),
        beforeBerlinMidnight,
      ),
    ).toBe(false);
  });

  test("uses the time zone of the citizen, not the one of the server", () => {
    // 2027-01-01 00:00 in Asia/Tokyo, still 2026-12-31 16:00 in Europe/Berlin
    const tokyoMidnight = new Date("2026-12-31T15:00:00Z");

    expect(
      shouldGreetForNewYear(
        candidate({ timezone: "Asia/Tokyo" }),
        tokyoMidnight,
      ),
    ).toBe(true);
    expect(
      shouldGreetForNewYear(
        candidate({ timezone: "Europe/Berlin" }),
        tokyoMidnight,
      ),
    ).toBe(false);

    // 2027-01-01 00:00 in Europe/Berlin, still 2026-12-31 18:00 in New York
    const berlinMidnight = new Date("2026-12-31T23:00:00Z");

    expect(
      shouldGreetForNewYear(
        candidate({ timezone: "America/New_York" }),
        berlinMidnight,
      ),
    ).toBe(false);
    expect(
      shouldGreetForNewYear(
        candidate({ timezone: "Europe/Berlin" }),
        berlinMidnight,
      ),
    ).toBe(true);
  });

  test("falls back to Europe/Berlin without a time zone", () => {
    // 2027-01-01 00:00 in Europe/Berlin
    const berlinMidnight = new Date("2026-12-31T23:00:00Z");

    expect(shouldGreetForNewYear(candidate({}), berlinMidnight)).toBe(true);
    // 2026-12-31 23:00 in Europe/Berlin, already 2027 in Asia/Tokyo
    expect(
      shouldGreetForNewYear(candidate({}), new Date("2026-12-31T22:00:00Z")),
    ).toBe(false);
  });

  test("greets only once for each local year", () => {
    // 2027-01-01 13:00 in Europe/Berlin
    const now = new Date("2027-01-01T12:00:00Z");

    expect(
      shouldGreetForNewYear(
        candidate({ newYearGreetingSentAt: new Date("2027-01-01T00:10:00Z") }),
        now,
      ),
    ).toBe(false);

    expect(
      shouldGreetForNewYear(
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
      shouldGreetForNewYear(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2027-01-01T09:00:00Z"),
      ),
    ).toBe(false);

    expect(
      shouldGreetForNewYear(
        { ...greeted, timezone: "Europe/Berlin" },
        new Date("2028-01-01T09:00:00Z"),
      ),
    ).toBe(true);
  });

  test("does not greet twice when the citizen moves west across the date line", () => {
    // Greeted at the local midnight of Pacific/Kiritimati (UTC+14) …
    const greeted = candidate({
      timezone: "Pacific/Niue",
      newYearGreetingSentAt: new Date("2026-12-31T10:00:00Z"),
    });

    // … and it is still January 1 in Pacific/Niue (UTC-11) 48 hours later,
    // where the marker falls into 2026. This is the widest gap the allowlist
    // of the app can produce.
    expect(
      shouldGreetForNewYear(greeted, new Date("2027-01-02T10:00:00Z")),
    ).toBe(false);
    expect(
      shouldGreetForNewYear(greeted, new Date("2027-01-02T10:45:00Z")),
    ).toBe(false);
  });

  test("throws for a time zone the runtime does not know", () => {
    expect(() =>
      shouldGreetForNewYear(
        candidate({ timezone: "Mars/Olympus_Mons" }),
        new Date("2027-01-01T12:00:00Z"),
      ),
    ).toThrow();
  });
});

describe("the runs around the turn of the year", () => {
  const inZone = (timezone: string | null) => candidate({ timezone });

  test("greets the first time zone 14 hours before Berlin", () => {
    const now = new Date("2026-12-31T10:00:00Z");

    expect(shouldGreetForNewYear(inZone("Pacific/Kiritimati"), now)).toBe(true);
    expect(shouldGreetForNewYear(inZone("Asia/Tokyo"), now)).toBe(false);
    expect(shouldGreetForNewYear(inZone("Europe/Berlin"), now)).toBe(false);
    expect(shouldGreetForNewYear(inZone(null), now)).toBe(false);
    expect(shouldGreetForNewYear(inZone("Pacific/Honolulu"), now)).toBe(false);
  });

  test("greets Berlin and the citizens without a time zone at their midnight", () => {
    const now = new Date("2026-12-31T23:05:00Z");

    expect(shouldGreetForNewYear(inZone("Europe/Berlin"), now)).toBe(true);
    expect(shouldGreetForNewYear(inZone(null), now)).toBe(true);
    expect(shouldGreetForNewYear(inZone("America/New_York"), now)).toBe(false);
    expect(shouldGreetForNewYear(inZone("Pacific/Honolulu"), now)).toBe(false);
  });

  test("greets the last time zone 10 hours after Berlin", () => {
    const now = new Date("2027-01-01T10:05:00Z");

    expect(shouldGreetForNewYear(inZone("Pacific/Honolulu"), now)).toBe(true);
  });

  test("greets nobody a second time on the same local day", () => {
    const berlinCitizen = candidate({
      timezone: "Europe/Berlin",
      newYearGreetingSentAt: new Date("2026-12-31T23:05:00Z"),
    });

    expect(
      shouldGreetForNewYear(berlinCitizen, new Date("2026-12-31T23:20:00Z")),
    ).toBe(false);
    // 2027-01-01 23:50 in Europe/Berlin, the last run of the local day
    expect(
      shouldGreetForNewYear(berlinCitizen, new Date("2027-01-01T22:50:00Z")),
    ).toBe(false);
  });
});
