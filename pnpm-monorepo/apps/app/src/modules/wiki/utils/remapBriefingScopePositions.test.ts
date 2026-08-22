import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import { remapBriefingScopePositions } from "./copyWikiPageSubtree";

const page = (
  overrides: Partial<Parameters<typeof remapBriefingScopePositions>[0]> = {},
) => ({
  eventReadScope: WikiPageEventScope.INHERIT,
  eventReadScopePositionId: null,
  eventEditScope: WikiPageEventScope.INHERIT,
  eventEditScopePositionId: null,
  ...overrides,
});

const POSITION_MAP = new Map([["template-position", "event-position"]]);

describe("remap briefing scope positions", () => {
  test("points a position-scoped page at the cloned position", () => {
    expect(
      remapBriefingScopePositions(
        page({
          eventReadScope: WikiPageEventScope.POSITION,
          eventReadScopePositionId: "template-position",
          eventEditScope: WikiPageEventScope.POSITION,
          eventEditScopePositionId: "template-position",
        }),
        POSITION_MAP,
      ),
    ).toEqual({
      eventReadScope: WikiPageEventScope.POSITION,
      eventReadScopePositionId: "event-position",
      eventEditScope: WikiPageEventScope.POSITION,
      eventEditScopePositionId: "event-position",
    });
  });

  test("keeps the scopes of a page that references no position", () => {
    expect(
      remapBriefingScopePositions(
        page({
          eventReadScope: WikiPageEventScope.PARTICIPANTS,
          eventEditScope: WikiPageEventScope.MANAGERS,
        }),
        POSITION_MAP,
      ),
    ).toEqual({
      eventReadScope: WikiPageEventScope.PARTICIPANTS,
      eventReadScopePositionId: null,
      eventEditScope: WikiPageEventScope.MANAGERS,
      eventEditScopePositionId: null,
    });
  });

  test("drops a stale reference the scope no longer uses", () => {
    expect(
      remapBriefingScopePositions(
        page({
          eventReadScope: WikiPageEventScope.ALL,
          eventReadScopePositionId: "template-position",
        }),
        POSITION_MAP,
      ).eventReadScopePositionId,
    ).toBeNull();
  });

  test("degrades an unmapped position to managers-only, like a deleted one", () => {
    expect(
      remapBriefingScopePositions(
        page({
          eventReadScope: WikiPageEventScope.POSITION,
          eventReadScopePositionId: "gone",
        }),
        POSITION_MAP,
      ).eventReadScopePositionId,
    ).toBeNull();
  });
});
