import { EventTemplateAccessType } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  resolveEventTemplatePermissions,
  type EventTemplatePermissionSource,
  type EventTemplateViewer,
} from "./index.js";

const OWNER_ID = "owner-citizen";

const template = (
  overrides: Partial<EventTemplatePermissionSource> = {},
): EventTemplatePermissionSource => ({
  id: "template",
  ownedById: OWNER_ID,
  deletedAt: null,
  roleAccess: [],
  ...overrides,
});

const viewer = (
  overrides: Partial<EventTemplateViewer> = {},
): EventTemplateViewer => ({
  citizenId: "some-citizen",
  roleIds: new Set(),
  hasEventManage: false,
  hasTemplateShareManage: false,
  ...overrides,
});

const resolve = (
  source: EventTemplatePermissionSource,
  currentViewer: EventTemplateViewer,
) => resolveEventTemplatePermissions([source], currentViewer).get(source.id);

describe("resolve event template permissions", () => {
  test("grants the owner everything but sharing without the share permission", () => {
    expect(resolve(template(), viewer({ citizenId: OWNER_ID }))).toEqual({
      canRead: true,
      canEdit: true,
      canManage: true,
      canManageShares: false,
    });
  });

  test("grants the owner sharing with the share permission", () => {
    expect(
      resolve(
        template(),
        viewer({ citizenId: OWNER_ID, hasTemplateShareManage: true }),
      ),
    ).toEqual({
      canRead: true,
      canEdit: true,
      canManage: true,
      canManageShares: true,
    });
  });

  test("grants nothing to a stranger", () => {
    expect(
      resolve(template(), viewer({ roleIds: new Set(["member"]) })),
    ).toEqual({
      canRead: false,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("grants read only for a READ share", () => {
    expect(
      resolve(
        template({
          roleAccess: [
            { roleId: "member", type: EventTemplateAccessType.READ },
          ],
        }),
        viewer({ roleIds: new Set(["member"]) }),
      ),
    ).toEqual({
      canRead: true,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("an EDIT share implies read but no sharing or deletion", () => {
    expect(
      resolve(
        template({
          roleAccess: [
            { roleId: "member", type: EventTemplateAccessType.EDIT },
          ],
        }),
        viewer({
          roleIds: new Set(["member"]),
          /** Holding the permission does not extend a share */
          hasTemplateShareManage: true,
        }),
      ),
    ).toEqual({
      canRead: true,
      canEdit: true,
      canManage: false,
      canManageShares: false,
    });
  });

  test("ignores shares for roles the viewer does not hold", () => {
    expect(
      resolve(
        template({
          roleAccess: [
            { roleId: "officer", type: EventTemplateAccessType.EDIT },
          ],
        }),
        viewer({ roleIds: new Set(["member"]) }),
      ),
    ).toEqual({
      canRead: false,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("`event;manage` gets everything on a foreign personal template", () => {
    expect(resolve(template(), viewer({ hasEventManage: true }))).toEqual({
      canRead: true,
      canEdit: true,
      canManage: true,
      canManageShares: true,
    });
  });

  test("a deleted template grants nothing to a shared role", () => {
    expect(
      resolve(
        template({
          deletedAt: new Date(),
          roleAccess: [
            { roleId: "member", type: EventTemplateAccessType.EDIT },
          ],
        }),
        viewer({ roleIds: new Set(["member"]) }),
      ),
    ).toEqual({
      canRead: false,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("a deleted template stays manageable by its owner, for the restore", () => {
    expect(
      resolve(
        template({ deletedAt: new Date() }),
        viewer({ citizenId: OWNER_ID }),
      ),
    ).toEqual({
      canRead: true,
      canEdit: true,
      canManage: true,
      canManageShares: false,
    });
  });

  test("a deleted template stays manageable by `event;manage`", () => {
    expect(
      resolve(
        template({ deletedAt: new Date() }),
        viewer({ hasEventManage: true }),
      ),
    ).toEqual({
      canRead: true,
      canEdit: true,
      canManage: true,
      canManageShares: true,
    });
  });

  test("the creator loses access once ownership moved on", () => {
    expect(
      resolve(
        template({ ownedById: "new-owner" }),
        viewer({ citizenId: OWNER_ID, hasTemplateShareManage: true }),
      ),
    ).toEqual({
      canRead: false,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("a session without a citizen never owns a template", () => {
    expect(
      resolve(template({ ownedById: null }), viewer({ citizenId: null })),
    ).toEqual({
      canRead: false,
      canEdit: false,
      canManage: false,
      canManageShares: false,
    });
  });

  test("returns undefined for a template that was not passed in", () => {
    expect(
      resolveEventTemplatePermissions([template()], viewer()).get("other"),
    ).toBeUndefined();
  });
});
