import { FlowRoleAccessType } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  resolveEffectiveRoles,
  resolveFlowPermissions,
  type FlowPermissionSource,
  type FlowViewer,
} from "./index.js";

const flow = (
  overrides: Partial<FlowPermissionSource> & { id: string },
): FlowPermissionSource => ({
  deletedAt: null,
  roleAccess: [],
  ...overrides,
});

const viewer = (overrides: Partial<FlowViewer> = {}): FlowViewer => ({
  roleIds: new Set(),
  hasCareerManage: false,
  ...overrides,
});

describe("resolve flow permissions", () => {
  test("grants nothing without any role access", () => {
    const permissions = resolveFlowPermissions(
      [flow({ id: "academy" })],
      viewer({ roleIds: new Set(["member"]) }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: false,
      canUpdate: false,
    });
  });

  test("grants read only for a READ tier", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [{ roleId: "member", type: FlowRoleAccessType.READ }],
        }),
      ],
      viewer({ roleIds: new Set(["member"]) }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: true,
      canUpdate: false,
    });
  });

  test("an UPDATE tier implies read", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [{ roleId: "editor", type: FlowRoleAccessType.UPDATE }],
        }),
      ],
      viewer({ roleIds: new Set(["editor"]) }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: true,
      canUpdate: true,
    });
  });

  test("ignores access rows of roles the viewer does not hold", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [{ roleId: "editor", type: FlowRoleAccessType.UPDATE }],
        }),
      ],
      viewer({ roleIds: new Set(["member"]) }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: false,
      canUpdate: false,
    });
  });

  test("takes the highest tier when several roles grant access", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [
            { roleId: "member", type: FlowRoleAccessType.READ },
            { roleId: "editor", type: FlowRoleAccessType.UPDATE },
          ],
        }),
      ],
      viewer({ roleIds: new Set(["member", "editor"]) }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: true,
      canUpdate: true,
    });
  });

  test("career;manage grants read and edit on every flow", () => {
    const permissions = resolveFlowPermissions(
      [flow({ id: "academy" }), flow({ id: "team" })],
      viewer({ hasCareerManage: true }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: true,
      canUpdate: true,
    });
    expect(permissions.get("team")).toEqual({
      canRead: true,
      canUpdate: true,
    });
  });

  test("a soft-deleted flow grants nothing, not even to a manager", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          deletedAt: new Date("2026-08-21T10:00:00.000Z"),
          roleAccess: [{ roleId: "editor", type: FlowRoleAccessType.UPDATE }],
        }),
      ],
      viewer({ roleIds: new Set(["editor"]), hasCareerManage: true }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: false,
      canUpdate: false,
    });
  });

  test("resolves nothing for an unknown flow", () => {
    const permissions = resolveFlowPermissions(
      [flow({ id: "academy" })],
      viewer({ hasCareerManage: true }),
    );

    expect(permissions.get("does-not-exist")).toBeUndefined();
  });

  /**
   * The viewer is built from `resolveEffectiveRoles()` everywhere, so the
   * level gate and role inheritance reach the flow resolver the same way they
   * reach the wiki one.
   */
  test("an inherited role grants what it was granted", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [{ roleId: "editor", type: FlowRoleAccessType.UPDATE }],
        }),
      ],
      viewer({
        roleIds: new Set(
          resolveEffectiveRoles([
            {
              currentLevel: null,
              role: {
                id: "lead",
                maxLevel: null,
                inherits: [{ id: "editor" }],
              },
            },
          ]).map((role) => role.id),
        ),
      }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: true,
      canUpdate: true,
    });
  });

  test("a role below its max level grants nothing", () => {
    const permissions = resolveFlowPermissions(
      [
        flow({
          id: "academy",
          roleAccess: [{ roleId: "editor", type: FlowRoleAccessType.UPDATE }],
        }),
      ],
      viewer({
        roleIds: new Set(
          resolveEffectiveRoles([
            {
              currentLevel: 1,
              role: { id: "editor", maxLevel: 3, inherits: [] },
            },
          ]).map((role) => role.id),
        ),
      }),
    );

    expect(permissions.get("academy")).toEqual({
      canRead: false,
      canUpdate: false,
    });
  });
});
