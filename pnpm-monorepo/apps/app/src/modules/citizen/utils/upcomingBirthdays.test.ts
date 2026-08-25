import { describe, expect, test } from "vitest";
import { getNextBirthday } from "./upcomingBirthdays";

/** The list uses Europe/Berlin, thus 12:00 UTC is always the same local day */
const noonOn = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);

const nextBirthdayOn = (
  birthdayDay: number,
  birthdayMonth: number,
  isoToday: string,
) => {
  const next = getNextBirthday(birthdayDay, birthdayMonth, noonOn(isoToday));
  return {
    date: next.date.toISOString().slice(0, 10),
    daysUntil: next.daysUntil,
  };
};

describe("getNextBirthday", () => {
  test("counts a birthday later this year", () => {
    expect(nextBirthdayOn(24, 12, "2026-08-25")).toEqual({
      date: "2026-12-24",
      daysUntil: 121,
    });
  });

  test("keeps a birthday of today in the list", () => {
    expect(nextBirthdayOn(25, 8, "2026-08-25")).toEqual({
      date: "2026-08-25",
      daysUntil: 0,
    });
  });

  test("moves a birthday which already passed into the next year", () => {
    expect(nextBirthdayOn(24, 8, "2026-08-25")).toEqual({
      date: "2027-08-24",
      daysUntil: 364,
    });
  });

  test("reads the day in Europe/Berlin, not in UTC", () => {
    // 2026-08-26 00:30 in Europe/Berlin, still 2026-08-25 in UTC
    const next = getNextBirthday(26, 8, new Date("2026-08-25T22:30:00Z"));

    expect(next.daysUntil).toBe(0);
  });

  test("celebrates a February 29 birthday on March 1 of a common year", () => {
    expect(nextBirthdayOn(29, 2, "2027-01-01")).toEqual({
      date: "2027-03-01",
      daysUntil: 59,
    });
  });

  test("celebrates a February 29 birthday on February 29 of a leap year", () => {
    expect(nextBirthdayOn(29, 2, "2028-01-01")).toEqual({
      date: "2028-02-29",
      daysUntil: 59,
    });
  });

  test("crosses the turn of the year", () => {
    expect(nextBirthdayOn(1, 1, "2026-12-31")).toEqual({
      date: "2027-01-01",
      daysUntil: 1,
    });
  });
});
