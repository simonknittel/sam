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

  test.each([
    {
      type: AuditEventType.ROLE_TAG_CREATED,
      data: { tagId: "tag", name: "Flight", description: null },
      message: 'Role tag created: "Flight" (tag)',
    },
    {
      type: AuditEventType.ROLE_TAG_UPDATED,
      data: {
        tagId: "tag",
        previousName: "Flight",
        newName: "Flug",
        previousDescription: null,
        newDescription: "Piloten",
      },
      message: 'Role tag updated: "Flight" → "Flug" (tag)',
    },
    {
      type: AuditEventType.ROLE_TAG_DELETED,
      data: { tagId: "tag", name: "Flug", roleIds: ["pilot", "gunner"] },
      message: 'Role tag deleted: "Flug" (tag), removed from 2 role(s)',
    },
    {
      type: AuditEventType.ROLE_TAG_ASSIGNMENTS_UPDATED,
      data: {
        added: [
          { roleId: "pilot", tagId: "tag" },
          { roleId: "gunner", tagId: "tag" },
        ],
        removed: [{ roleId: "medic", tagId: "tag" }],
      },
      message: "Role tags updated: 2 link(s) added, 1 link(s) removed",
    },
  ])("renders the role tag event $type", ({ type, data, message }) => {
    expect(getAuditEventMessage(type, JSON.stringify(data))).toBe(message);
  });

  test("accepts a payload that was stored unencoded", () => {
    expect(
      getAuditEventMessage(AuditEventType.TRASHED_WIKI_PAGES_PURGED, {
        count: 3,
      }),
    ).toBe("Permanently deleted 3 trashed wiki page(s)");
  });
});
