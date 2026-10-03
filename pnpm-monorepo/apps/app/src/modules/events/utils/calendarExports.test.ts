/**
 * The results must not depend on the time zone of the system. Run this
 * suite with the environment variable TZ set to different zones.
 */
import type { Event } from "@sam-monorepo/database/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getGoogleCalendarUrl } from "./getGoogleCalendarUrl";
import { getIcsFile } from "./getIcsFile";
import { getOutlookUrl } from "./getOutlookUrl";

vi.mock("server-only", () => ({}));

const ICS_DATA_URL_PREFIX = "data:text/calendar;charset=utf-8,";

const SUMMER_EVENT = {
  name: "Polaris-Einsatz",
  startTime: new Date("2026-09-04T12:30:00Z"),
  endTime: new Date("2026-09-04T15:00:00Z"),
  description: "**Treffpunkt** am Hangar",
  location: "Stanton",
} as Event;

/** The end is in the second 02:30 of the fall-back night in Europe/Berlin */
const FALL_BACK_EVENT = {
  ...SUMMER_EVENT,
  startTime: new Date("2026-10-25T00:30:00Z"),
  endTime: new Date("2026-10-25T01:30:00Z"),
} as Event;

const EVENT_WITHOUT_END = {
  name: "Polaris-Einsatz",
  startTime: new Date("2026-12-04T18:30:00Z"),
  endTime: null,
  description: null,
  location: null,
} as Event;

/** `ics` gives each event a random UID */
const readIcsFile = (event: Event) =>
  decodeURIComponent(
    getIcsFile(event).slice(ICS_DATA_URL_PREFIX.length),
  ).replace(/^UID:.+$/m, "UID:random");

beforeEach(() => {
  vi.setSystemTime(new Date("2026-08-01T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getIcsFile", () => {
  test("writes the start and the end in UTC", () => {
    expect(readIcsFile(SUMMER_EVENT)).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "PRODID:adamgibbons/ics",
        "METHOD:PUBLISH",
        "X-PUBLISHED-TTL:PT1H",
        "BEGIN:VEVENT",
        "UID:random",
        "SUMMARY:Polaris-Einsatz",
        "DTSTAMP:20260801T100000Z",
        "DTSTART:20260904T123000Z",
        "DTEND:20260904T150000Z",
        "DESCRIPTION:Treffpunkt am Hangar",
        "LOCATION:Stanton",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });

  test("keeps the end in the fall-back night", () => {
    expect(readIcsFile(FALL_BACK_EVENT)).toContain(
      "DTSTART:20261025T003000Z\r\nDTEND:20261025T013000Z\r\n",
    );
  });

  test("ends an event without an end at its start", () => {
    expect(readIcsFile(EVENT_WITHOUT_END)).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "PRODID:adamgibbons/ics",
        "METHOD:PUBLISH",
        "X-PUBLISHED-TTL:PT1H",
        "BEGIN:VEVENT",
        "UID:random",
        "SUMMARY:Polaris-Einsatz",
        "DTSTAMP:20260801T100000Z",
        "DTSTART:20261204T183000Z",
        "DTEND:20261204T183000Z",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });
});

describe("getGoogleCalendarUrl", () => {
  test("gives the dates in the basic format in UTC", () => {
    expect(getGoogleCalendarUrl(SUMMER_EVENT)).toBe(
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Polaris-Einsatz&dates=20260904T123000Z%2F20260904T150000Z&ctz=UTC&details=Treffpunkt+am+Hangar&location=Stanton",
    );
  });

  test("ends an event without an end at its start", () => {
    expect(getGoogleCalendarUrl(EVENT_WITHOUT_END)).toBe(
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Polaris-Einsatz&dates=20261204T183000Z%2F20261204T183000Z&ctz=UTC",
    );
  });
});

describe("getOutlookUrl", () => {
  test("gives the exact start and end in UTC", () => {
    expect(getOutlookUrl(SUMMER_EVENT)).toBe(
      "https://outlook.live.com/calendar/deeplink/compose?subject=Polaris-Einsatz&startdt=2026-09-04T12%3A30%3A00Z&enddt=2026-09-04T15%3A00%3A00Z&body=Treffpunkt+am+Hangar&location=Stanton",
    );
  });

  test("keeps the end in the fall-back night", () => {
    const url = new URL(getOutlookUrl(FALL_BACK_EVENT));

    expect(url.searchParams.get("startdt")).toBe("2026-10-25T00:30:00Z");
    expect(url.searchParams.get("enddt")).toBe("2026-10-25T01:30:00Z");
  });
});
