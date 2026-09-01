import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  getEventWikiReadAudienceLabel,
  getWikiRoleReadAudienceLabel,
} from "./wikiReadAudienceLabel";

const positionNameOf = (positionId: string) =>
  positionId === "marine" ? "Marine" : undefined;

describe("global wiki read audience label", () => {
  test("everybody with wiki access wins over the reading roles", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: true, hasReadRoles: false }),
    ).toBe("alle");
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: true, hasReadRoles: true }),
    ).toBe("alle");
  });

  test("without a reading role only the owner and the managers are left", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, hasReadRoles: false }),
    ).toBe("nur Besitzer & Manager");
  });

  test("reading roles are reported without naming or counting them", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, hasReadRoles: true }),
    ).toBe("ausgewählte Rollen");
  });
});

describe("event wiki read audience label", () => {
  test("the absolute scopes have their own wording", () => {
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.ALL, positionId: null },
        positionNameOf,
      ),
    ).toBe("alle");
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.PARTICIPANTS, positionId: null },
        positionNameOf,
      ),
    ).toBe("Eventteilnehmer");
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.MANAGERS, positionId: null },
        positionNameOf,
      ),
    ).toBe("Event-Manager");
  });

  test("a lineup position is named", () => {
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.POSITION, positionId: "marine" },
        positionNameOf,
      ),
    ).toBe("Aufstellung „Marine“");
  });

  test("a position that no longer exists leaves the group nameless", () => {
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.POSITION, positionId: "deleted" },
        positionNameOf,
      ),
    ).toBe("Aufstellung");
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.POSITION, positionId: null },
        positionNameOf,
      ),
    ).toBe("Aufstellung");
  });

  test("a leftover INHERIT reads as managers only, like in the resolver", () => {
    expect(
      getEventWikiReadAudienceLabel(
        { scope: WikiPageEventScope.INHERIT, positionId: null },
        positionNameOf,
      ),
    ).toBe("Event-Manager");
  });
});
