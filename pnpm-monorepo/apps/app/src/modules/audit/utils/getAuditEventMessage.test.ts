import { describe, expect, test } from "vitest";
import { AuditEventType } from "./AuditEventTypes";
import { getAuditEventMessage } from "./getAuditEventMessage";

describe("get audit event message", () => {
  test("renders a known type from its payload", () => {
    expect(
      getAuditEventMessage(
        AuditEventType.MANUFACTURER_CREATED,
        JSON.stringify({ manufacturerId: "abc", name: "Drake" }),
      ),
    ).toBe("Manufacturer Drake created (abc)");
  });

  test("falls back to the raw payload for a type that no longer exists", () => {
    const rawData = JSON.stringify({ shipId: "abc" });

    expect(getAuditEventMessage("SHIP_TELEPORTED", rawData)).toBe(rawData);
  });

  test("falls back when the payload predates the current shape", () => {
    /** The definition reads `data.eventIds.length` */
    const rawData = JSON.stringify({ eventId: "abc" });

    expect(
      getAuditEventMessage(AuditEventType.EVENT_DELETED_FROM_DISCORD, rawData),
    ).toBe(rawData);
  });

  test("falls back when the column does not hold valid JSON", () => {
    expect(getAuditEventMessage(AuditEventType.SERIES_CREATED, "{")).toBe("{");
  });

  test("accepts a payload that was stored unencoded", () => {
    expect(
      getAuditEventMessage(AuditEventType.TRASHED_WIKI_PAGES_PURGED, {
        count: 3,
      }),
    ).toBe("Permanently deleted 3 trashed wiki page(s)");
  });
});
