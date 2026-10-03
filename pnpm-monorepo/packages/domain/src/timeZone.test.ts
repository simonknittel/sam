/**
 * The results must not depend on the time zone of the system. Run this
 * suite with the environment variable TZ set to different zones.
 */

import { describe, expect, test } from "vitest";
import {
  getLocalDate,
  instantToWallTime,
  ORGANIZATION_TIMEZONE,
  wallTimeToInstant,
} from "./timeZone.js";

const LOS_ANGELES = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";

describe("wallTimeToInstant", () => {
  test.each([
    ["winter time", "2026-01-15T20:00", "2026-01-15T19:00:00.000Z"],
    ["summer time", "2026-08-16T20:00", "2026-08-16T18:00:00.000Z"],
    ["midnight", "2026-08-16T00:00", "2026-08-15T22:00:00.000Z"],
    [
      "the minute before the gap",
      "2026-03-29T01:59",
      "2026-03-29T00:59:00.000Z",
    ],
    [
      "the first minute after the gap",
      "2026-03-29T03:00",
      "2026-03-29T01:00:00.000Z",
    ],
    [
      "a wall time in the gap, moved forward by one hour",
      "2026-03-29T02:30",
      "2026-03-29T01:30:00.000Z",
    ],
    [
      "the minute before the overlap",
      "2026-10-25T01:59",
      "2026-10-24T23:59:00.000Z",
    ],
    [
      "a wall time in the overlap, the later instant",
      "2026-10-25T02:30",
      "2026-10-25T01:30:00.000Z",
    ],
    [
      "the first minute after the overlap",
      "2026-10-25T03:00",
      "2026-10-25T02:00:00.000Z",
    ],
  ])("Europe/Berlin: %s (%s)", (_description, wallTime, expectedInstant) => {
    expect(
      wallTimeToInstant(wallTime, ORGANIZATION_TIMEZONE).toISOString(),
    ).toBe(expectedInstant);
  });

  test.each([
    [
      "a wall time in the gap, moved forward by one hour",
      "2026-03-08T02:30",
      "2026-03-08T10:30:00.000Z",
    ],
    [
      "a wall time in the overlap, the later instant",
      "2026-11-01T01:30",
      "2026-11-01T09:30:00.000Z",
    ],
  ])(
    "America/Los_Angeles: %s (%s)",
    (_description, wallTime, expectedInstant) => {
      expect(wallTimeToInstant(wallTime, LOS_ANGELES).toISOString()).toBe(
        expectedInstant,
      );
    },
  );

  test("a zone without daylight saving time", () => {
    expect(wallTimeToInstant("2026-08-16T20:00", TOKYO).toISOString()).toBe(
      "2026-08-16T11:00:00.000Z",
    );
  });

  test.each([
    "gestern Abend",
    "2026-02-30T20:00",
    "2026-01-15T24:00",
    "2026-01-15T20:00:30",
    "2026-01-15T20:00Z",
    "2026-01-15T20:00+05:00",
  ])("rejects the invalid wall time %s", (wallTime) => {
    expect(() => wallTimeToInstant(wallTime, ORGANIZATION_TIMEZONE)).toThrow(
      "Invalid wall time",
    );
  });

  test("rejects an unknown time zone", () => {
    expect(() => wallTimeToInstant("2026-01-15T20:00", "Mars/Olympus")).toThrow(
      RangeError,
    );
  });
});

describe("instantToWallTime", () => {
  test.each([
    ["winter time", "2026-01-15T19:00:00.000Z", "2026-01-15T20:00"],
    ["summer time", "2026-08-16T18:00:00.000Z", "2026-08-16T20:00"],
    ["midnight", "2026-08-15T22:00:00.000Z", "2026-08-16T00:00"],
    [
      "the earlier instant of the overlap",
      "2026-10-25T00:30:00.000Z",
      "2026-10-25T02:30",
    ],
    [
      "the later instant of the overlap",
      "2026-10-25T01:30:00.000Z",
      "2026-10-25T02:30",
    ],
  ])("Europe/Berlin: %s (%s)", (_description, instant, expectedWallTime) => {
    expect(instantToWallTime(new Date(instant), ORGANIZATION_TIMEZONE)).toBe(
      expectedWallTime,
    );
  });

  test("America/Los_Angeles", () => {
    expect(
      instantToWallTime(new Date("2026-11-01T09:30:00.000Z"), LOS_ANGELES),
    ).toBe("2026-11-01T01:30");
  });

  test.each([
    "2026-01-15T20:00",
    "2026-08-16T20:00",
    "2026-03-29T03:00",
    "2026-10-25T03:00",
  ])("is the inverse of wallTimeToInstant for %s", (wallTime) => {
    expect(
      instantToWallTime(
        wallTimeToInstant(wallTime, ORGANIZATION_TIMEZONE),
        ORGANIZATION_TIMEZONE,
      ),
    ).toBe(wallTime);
  });
});

describe("getLocalDate", () => {
  test("gives the date in the given zone, not in UTC", () => {
    const moment = new Date("2026-08-15T22:30:00.000Z");

    expect(getLocalDate(moment, ORGANIZATION_TIMEZONE)).toEqual({
      year: 2026,
      month: 8,
      day: 16,
    });
    expect(getLocalDate(moment, "UTC")).toEqual({
      year: 2026,
      month: 8,
      day: 15,
    });
  });
});
