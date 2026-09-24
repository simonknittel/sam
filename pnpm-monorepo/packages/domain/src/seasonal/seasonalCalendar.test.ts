import { describe, expect, test } from "vitest";
import type { LocalDate } from "../citizen/birthday.js";
import {
  findSeasonalEventOverlaps,
  getActiveSeasonalEvent,
  isSeasonalGreetingDay,
  SEASONAL_EVENT_DEFINITIONS,
  SeasonalEventKey,
} from "./seasonalCalendar.js";

/** The calendar knows months and days only, thus any year answers the same */
const DEFAULT_YEAR = 2026;

const localDate = (
  month: number,
  day: number,
  year = DEFAULT_YEAR,
): LocalDate => ({ year, month, day });

describe("the theme ranges", () => {
  test("Halloween runs from October 1 to October 31", () => {
    expect(getActiveSeasonalEvent(localDate(9, 30))).toBeNull();
    expect(getActiveSeasonalEvent(localDate(10, 1))).toBe(
      SeasonalEventKey.Halloween,
    );
    expect(getActiveSeasonalEvent(localDate(10, 31))).toBe(
      SeasonalEventKey.Halloween,
    );
    expect(getActiveSeasonalEvent(localDate(11, 1))).toBeNull();
  });

  test("Christmas runs from December 1 to December 26", () => {
    expect(getActiveSeasonalEvent(localDate(11, 30))).toBeNull();
    expect(getActiveSeasonalEvent(localDate(12, 1))).toBe(
      SeasonalEventKey.Christmas,
    );
    expect(getActiveSeasonalEvent(localDate(12, 26))).toBe(
      SeasonalEventKey.Christmas,
    );
  });

  test("New Year follows Christmas on December 27 without a gap", () => {
    expect(getActiveSeasonalEvent(localDate(12, 26))).toBe(
      SeasonalEventKey.Christmas,
    );
    expect(getActiveSeasonalEvent(localDate(12, 27))).toBe(
      SeasonalEventKey.NewYear,
    );
  });

  test("New Year ends on January 1", () => {
    expect(getActiveSeasonalEvent(localDate(1, 1))).toBe(
      SeasonalEventKey.NewYear,
    );
    expect(getActiveSeasonalEvent(localDate(1, 2))).toBeNull();
  });

  test("the New Year range holds both sides of the turn of the year", () => {
    expect(getActiveSeasonalEvent(localDate(12, 31, 2026))).toBe(
      SeasonalEventKey.NewYear,
    );
    expect(getActiveSeasonalEvent(localDate(1, 1, 2027))).toBe(
      SeasonalEventKey.NewYear,
    );
    expect(getActiveSeasonalEvent(localDate(1, 2, 2027))).toBeNull();
  });

  test("an ordinary day carries no event", () => {
    expect(getActiveSeasonalEvent(localDate(2, 29, 2028))).toBeNull();
    expect(getActiveSeasonalEvent(localDate(6, 15))).toBeNull();
  });
});

describe("the greeting days", () => {
  test("Halloween greets on October 31 only", () => {
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Halloween, localDate(10, 30)),
    ).toBe(false);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Halloween, localDate(10, 31)),
    ).toBe(true);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Halloween, localDate(11, 1)),
    ).toBe(false);
  });

  test("Christmas greets from December 24 to December 26", () => {
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Christmas, localDate(12, 23)),
    ).toBe(false);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Christmas, localDate(12, 24)),
    ).toBe(true);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Christmas, localDate(12, 26)),
    ).toBe(true);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Christmas, localDate(12, 27)),
    ).toBe(false);
  });

  test("New Year greets on January 1 only", () => {
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.NewYear, localDate(12, 31)),
    ).toBe(false);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.NewYear, localDate(1, 1)),
    ).toBe(true);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.NewYear, localDate(1, 2)),
    ).toBe(false);
  });

  test("an event does not greet on the day of another event", () => {
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.Halloween, localDate(12, 25)),
    ).toBe(false);
    expect(
      isSeasonalGreetingDay(SeasonalEventKey.NewYear, localDate(10, 31)),
    ).toBe(false);
  });
});

describe("the definitions", () => {
  test("hold no day twice", () => {
    expect(findSeasonalEventOverlaps()).toEqual([]);
  });

  /**
   * A greeting day outside the theme range of its event would show the
   * banner of an event the app does not decorate for. The walk covers every
   * possible month/day pair, because a range knows months and days only.
   */
  test("greet only on days their own theme covers", () => {
    for (const definition of Object.values(SEASONAL_EVENT_DEFINITIONS)) {
      for (let month = 1; month <= 12; month += 1) {
        for (let day = 1; day <= 31; day += 1) {
          if (!isSeasonalGreetingDay(definition.key, localDate(month, day)))
            continue;

          expect(getActiveSeasonalEvent(localDate(month, day))).toBe(
            definition.key,
          );
        }
      }
    }
  });

  test("carry the key they are stored under", () => {
    for (const [key, definition] of Object.entries(SEASONAL_EVENT_DEFINITIONS))
      expect(definition.key).toBe(key);
  });
});
