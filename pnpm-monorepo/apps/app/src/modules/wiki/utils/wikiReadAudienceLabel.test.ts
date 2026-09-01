import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  getEventWikiReadAudienceLabel,
  getWikiRoleReadAudienceLabel,
} from "./wikiReadAudienceLabel";

const positionNameOf = (positionId: string) =>
  positionId === "marine" ? "Marine" : undefined;

describe("global wiki read audience label", () => {
  test("everybody with wiki access wins over the role count", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: true, roleCount: 0 }),
    ).toBe("alle");
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: true, roleCount: 4 }),
    ).toBe("alle");
  });

  test("without a reading role only the owner and the managers are left", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, roleCount: 0 }),
    ).toBe("nur Besitzer & Manager");
  });

  test("one role is named in the singular, more in the plural", () => {
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, roleCount: 1 }),
    ).toBe("1 Rolle");
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, roleCount: 2 }),
    ).toBe("2 Rollen");
    expect(
      getWikiRoleReadAudienceLabel({ isEverybody: false, roleCount: 13 }),
    ).toBe("13 Rollen");
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
