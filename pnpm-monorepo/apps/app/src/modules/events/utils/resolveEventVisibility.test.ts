import { EventVisibility } from "@sam-monorepo/database/client";
import { resolveEffectiveRoles } from "@sam-monorepo/permissions";
import { describe, expect, test } from "vitest";
import {
  resolveEventVisibility,
  type EventViewer,
  type EventVisibilityInput,
} from "./resolveEventVisibility";

const baseEvent: EventVisibilityInput = {
  visibility: EventVisibility.RESTRICTED,
  createdById: "creator",
  deletedAt: null,
  visibilityRoles: [{ roleId: "allowed-role" }],
  managers: [{ id: "manager" }],
};

const baseViewer: EventViewer = {
  citizenId: "viewer",
  roleIds: new Set<string>(),
  hasEventManage: false,
};

/**
 * Builds the viewer's role id set the same way `getEventViewer()` does, so
 * the level and inheritance cases test the actual composition with
 * `resolveEffectiveRoles()`.
 */
const roleIdsFromAssignments = (
  roleAssignments: readonly {
    readonly currentLevel: number | null;
    readonly role: {
      readonly id: string;
      readonly maxLevel: number | null;
      readonly inherits: readonly { readonly id: string }[];
    };
  }[],
): ReadonlySet<string> =>
  new Set(resolveEffectiveRoles(roleAssignments).map((role) => role.id));

describe("resolveEventVisibility", () => {
  test("public events are visible to any viewer", () => {
    expect(
      resolveEventVisibility(
        { ...baseEvent, visibility: EventVisibility.PUBLIC },
        baseViewer,
      ),
    ).toBe(true);
  });

  test("restricted events are invisible without a matching role", () => {
    expect(resolveEventVisibility(baseEvent, baseViewer)).toBe(false);
  });

  test("restricted events are visible with a directly assigned allowed role", () => {
    const viewer: EventViewer = {
      ...baseViewer,
      roleIds: roleIdsFromAssignments([
        {
          currentLevel: null,
          role: { id: "allowed-role", maxLevel: null, inherits: [] },
        },
      ]),
    };

    expect(resolveEventVisibility(baseEvent, viewer)).toBe(true);
  });

  test("restricted events are visible with an inherited allowed role", () => {
    const viewer: EventViewer = {
      ...baseViewer,
      roleIds: roleIdsFromAssignments([
        {
          currentLevel: null,
          role: {
            id: "other-role",
            maxLevel: null,
            inherits: [{ id: "allowed-role" }],
          },
        },
      ]),
    };

    expect(resolveEventVisibility(baseEvent, viewer)).toBe(true);
  });

  test("a leveled allowed role does not count below its max level", () => {
    const viewer: EventViewer = {
      ...baseViewer,
      roleIds: roleIdsFromAssignments([
        {
          currentLevel: 2,
          role: { id: "allowed-role", maxLevel: 3, inherits: [] },
        },
      ]),
    };

    expect(resolveEventVisibility(baseEvent, viewer)).toBe(false);
  });

  test("a leveled allowed role counts at its max level", () => {
    const viewer: EventViewer = {
      ...baseViewer,
      roleIds: roleIdsFromAssignments([
        {
          currentLevel: 3,
          role: { id: "allowed-role", maxLevel: 3, inherits: [] },
        },
      ]),
    };

    expect(resolveEventVisibility(baseEvent, viewer)).toBe(true);
  });

  test("the creator always sees their restricted event", () => {
    expect(
      resolveEventVisibility(baseEvent, { ...baseViewer, citizenId: "creator" }),
    ).toBe(true);
  });

  test("managers always see their restricted event", () => {
    expect(
      resolveEventVisibility(baseEvent, { ...baseViewer, citizenId: "manager" }),
    ).toBe(true);
  });

  test("event;manage holders see every restricted event", () => {
    expect(
      resolveEventVisibility(baseEvent, { ...baseViewer, hasEventManage: true }),
    ).toBe(true);
  });

  test("soft-deleted events are invisible to everyone, including event;manage holders and the creator", () => {
    const deletedEvent: EventVisibilityInput = {
      ...baseEvent,
      visibility: EventVisibility.PUBLIC,
      deletedAt: new Date(),
    };

    expect(
      resolveEventVisibility(deletedEvent, {
        ...baseViewer,
        citizenId: "creator",
        hasEventManage: true,
      }),
    ).toBe(false);
  });

  test("a viewer without a citizen only sees public events", () => {
    const viewer: EventViewer = { ...baseViewer, citizenId: null };

    expect(resolveEventVisibility(baseEvent, viewer)).toBe(false);
    expect(
      resolveEventVisibility(
        { ...baseEvent, visibility: EventVisibility.PUBLIC },
        viewer,
      ),
    ).toBe(true);
  });
});
