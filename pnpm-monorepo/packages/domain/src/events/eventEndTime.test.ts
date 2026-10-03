import { describe, expect, test } from "vitest";
import { getEventEndTime } from "./eventEndTime.js";

describe("getEventEndTime", () => {
  test("gives the explicit end of an event", () => {
    const endTime = new Date("2026-09-04T13:00:00Z");

    expect(
      getEventEndTime({
        startTime: new Date("2026-09-04T12:00:00Z"),
        endTime,
      }),
    ).toBe(endTime);
  });

  test("ends an event without an explicit end 4 hours after its start", () => {
    expect(
      getEventEndTime({
        startTime: new Date("2026-09-04T12:00:00Z"),
        endTime: null,
      }).toISOString(),
    ).toBe("2026-09-04T16:00:00.000Z");
  });

  test.each([
    {
      change: "spring forward",
      startTime: "2026-03-29T00:30:00Z",
      endTime: "2026-03-29T04:30:00.000Z",
    },
    {
      change: "fall back",
      startTime: "2026-10-25T00:30:00Z",
      endTime: "2026-10-25T04:30:00.000Z",
    },
  ])(
    "adds exactly 4 hours across the $change change in Europe/Berlin",
    ({ startTime, endTime }) => {
      expect(
        getEventEndTime({
          startTime: new Date(startTime),
          endTime: null,
        }).toISOString(),
      ).toBe(endTime);
    },
  );
});
