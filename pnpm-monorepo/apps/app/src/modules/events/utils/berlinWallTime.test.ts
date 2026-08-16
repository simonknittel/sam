import { describe, expect, test } from "vitest";
import { berlinWallTimeToUtc, utcToBerlinWallTime } from "./berlinWallTime";

describe("berlinWallTimeToUtc", () => {
  test("converts CET (winter) wall time", () => {
    expect(berlinWallTimeToUtc("2026-01-15T20:00").toISOString()).toBe(
      "2026-01-15T19:00:00.000Z",
    );
  });

  test("converts CEST (summer) wall time", () => {
    expect(berlinWallTimeToUtc("2026-08-16T20:00").toISOString()).toBe(
      "2026-08-16T18:00:00.000Z",
    );
  });

  test("last instant before the spring-forward gap (2026-03-29 01:59 CET)", () => {
    expect(berlinWallTimeToUtc("2026-03-29T01:59").toISOString()).toBe(
      "2026-03-29T00:59:00.000Z",
    );
  });

  test("first instant after the spring-forward gap (2026-03-29 03:00 CEST)", () => {
    expect(berlinWallTimeToUtc("2026-03-29T03:00").toISOString()).toBe(
      "2026-03-29T01:00:00.000Z",
    );
  });

  test("a wall time inside the spring-forward gap maps to one hour later", () => {
    // 02:30 does not exist on 2026-03-29 in Berlin; it resolves like 03:30 CEST
    expect(berlinWallTimeToUtc("2026-03-29T02:30").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  test("before the fall-back transition (2026-10-25 01:59 CEST)", () => {
    expect(berlinWallTimeToUtc("2026-10-25T01:59").toISOString()).toBe(
      "2026-10-24T23:59:00.000Z",
    );
  });

  test("an ambiguous fall-back wall time resolves to the later (CET) instant", () => {
    // 02:30 happens twice on 2026-10-25 in Berlin (CEST and CET)
    expect(berlinWallTimeToUtc("2026-10-25T02:30").toISOString()).toBe(
      "2026-10-25T01:30:00.000Z",
    );
  });

  test("after the fall-back transition (2026-10-25 03:00 CET)", () => {
    expect(berlinWallTimeToUtc("2026-10-25T03:00").toISOString()).toBe(
      "2026-10-25T02:00:00.000Z",
    );
  });

  test("midnight wall time", () => {
    expect(berlinWallTimeToUtc("2026-08-16T00:00").toISOString()).toBe(
      "2026-08-15T22:00:00.000Z",
    );
  });

  test("rejects malformed input", () => {
    expect(() => berlinWallTimeToUtc("gestern Abend")).toThrow();
  });
});

describe("utcToBerlinWallTime", () => {
  test("formats a winter instant", () => {
    expect(utcToBerlinWallTime(new Date("2026-01-15T19:00:00.000Z"))).toBe(
      "2026-01-15T20:00",
    );
  });

  test("formats a summer instant", () => {
    expect(utcToBerlinWallTime(new Date("2026-08-16T18:00:00.000Z"))).toBe(
      "2026-08-16T20:00",
    );
  });

  test("formats a Berlin midnight", () => {
    expect(utcToBerlinWallTime(new Date("2026-08-15T22:00:00.000Z"))).toBe(
      "2026-08-16T00:00",
    );
  });

  test("round-trips regular wall times", () => {
    for (const wallTime of [
      "2026-01-15T20:00",
      "2026-08-16T20:00",
      "2026-03-29T03:00",
      "2026-10-25T03:00",
    ]) {
      expect(utcToBerlinWallTime(berlinWallTimeToUtc(wallTime))).toBe(wallTime);
    }
  });
});
