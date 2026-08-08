import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  isEventWikiScopeSubset,
  type EventWikiScopeSelection,
} from "./isEventWikiScopeSubset";

const selection = (
  scope: WikiPageEventScope,
  positionId: string | null = null,
): EventWikiScopeSelection => ({ scope, positionId });

/** fleet → wing → squad, plus a sibling wing */
const positions = [
  { id: "fleet", parentPositionId: null },
  { id: "wing", parentPositionId: "fleet" },
  { id: "squad", parentPositionId: "wing" },
  { id: "other-wing", parentPositionId: "fleet" },
] as const;

describe("event wiki scope subset", () => {
  test("MANAGERS is contained in everything", () => {
    for (const outer of [
      WikiPageEventScope.MANAGERS,
      WikiPageEventScope.PARTICIPANTS,
      WikiPageEventScope.ALL,
    ]) {
      expect(
        isEventWikiScopeSubset(
          selection(WikiPageEventScope.MANAGERS),
          selection(outer),
          positions,
        ),
      ).toBe(true);
    }
  });

  test("ALL contains everything, MANAGERS contains only managers", () => {
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.PARTICIPANTS),
        selection(WikiPageEventScope.ALL),
        positions,
      ),
    ).toBe(true);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.PARTICIPANTS),
        selection(WikiPageEventScope.MANAGERS),
        positions,
      ),
    ).toBe(false);
  });

  test("PARTICIPANTS contains positions but not ALL", () => {
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "squad"),
        selection(WikiPageEventScope.PARTICIPANTS),
        positions,
      ),
    ).toBe(true);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.ALL),
        selection(WikiPageEventScope.PARTICIPANTS),
        positions,
      ),
    ).toBe(false);
  });

  test("a POSITION contains its subtree and nothing beside it", () => {
    const outerWing = selection(WikiPageEventScope.POSITION, "wing");

    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "squad"),
        outerWing,
        positions,
      ),
    ).toBe(true);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "wing"),
        outerWing,
        positions,
      ),
    ).toBe(true);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "other-wing"),
        outerWing,
        positions,
      ),
    ).toBe(false);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "fleet"),
        outerWing,
        positions,
      ),
    ).toBe(false);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.PARTICIPANTS),
        outerWing,
        positions,
      ),
    ).toBe(false);
  });

  test("INHERIT and dangling positions fail closed", () => {
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.INHERIT),
        selection(WikiPageEventScope.MANAGERS),
        positions,
      ),
    ).toBe(true);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.PARTICIPANTS),
        selection(WikiPageEventScope.INHERIT),
        positions,
      ),
    ).toBe(false);
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, null),
        selection(WikiPageEventScope.POSITION, "wing"),
        positions,
      ),
    ).toBe(false);
  });

  test("unknown position ids and corrupted lineups fail closed", () => {
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "ghost"),
        selection(WikiPageEventScope.POSITION, "wing"),
        positions,
      ),
    ).toBe(false);

    const cyclicPositions = [
      { id: "a", parentPositionId: "b" },
      { id: "b", parentPositionId: "a" },
    ] as const;
    expect(
      isEventWikiScopeSubset(
        selection(WikiPageEventScope.POSITION, "a"),
        selection(WikiPageEventScope.POSITION, "wing"),
        cyclicPositions,
      ),
    ).toBe(false);
  });
});
