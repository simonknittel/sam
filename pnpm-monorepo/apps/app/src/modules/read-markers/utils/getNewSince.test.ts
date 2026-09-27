import { describe, expect, it } from "vitest";
import { getNewSince } from "./getNewSince";

const trackedSince = new Date("2026-10-06T08:00:00Z");

describe("getNewSince", () => {
  it("uses the confirmation date of a viewer who joined after the rollout", () => {
    const emailVerified = new Date("2026-11-01T12:00:00Z");

    expect(getNewSince(trackedSince, emailVerified)).toBe(emailVerified);
  });

  it("uses the rollout date for a viewer who joined before it", () => {
    expect(getNewSince(trackedSince, new Date("2025-01-01T00:00:00Z"))).toBe(
      trackedSince,
    );
  });

  it("uses the rollout date for a viewer without a confirmation date", () => {
    expect(getNewSince(trackedSince, null)).toBe(trackedSince);
  });
});
