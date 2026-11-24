/**
 * The results must not depend on the time zone of the system. Run this
 * suite with the environment variable TZ set to different zones.
 */

import { describe, expect, test } from "vitest";
import { isBirthdayToday } from "./birthday.js";

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

  test("moves a February 29 birthday to March 1 only in a common year", () => {
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
    expect(
      isBirthdayToday(leapBirthday, new Date("2028-03-01T12:00:00Z")),
    ).toBe(false);
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
