import { expect, test } from "vitest";
import { getLogAnalyzerWindowStart } from "./logAnalyzerWindow.js";

test("starts at midnight of the organization, also across a daylight saving change", () => {
  /** 16 November is winter time, 2 November too */
  expect(
    getLogAnalyzerWindowStart(14, new Date("2026-11-16T10:00:00.000Z")),
  ).toEqual(new Date("2026-11-01T23:00:00.000Z"));

  /** 5 November is winter time, 22 October is summer time */
  expect(
    getLogAnalyzerWindowStart(14, new Date("2026-11-05T10:00:00.000Z")),
  ).toEqual(new Date("2026-10-21T22:00:00.000Z"));

  /** 23:30 UTC is already the next day in Berlin */
  expect(
    getLogAnalyzerWindowStart(1, new Date("2026-11-16T23:30:00.000Z")),
  ).toEqual(new Date("2026-11-15T23:00:00.000Z"));

  expect(getLogAnalyzerWindowStart(0, new Date())).toBeNull();
});
