import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  comparePermissionSets,
  getPermissionSetsByRoles,
  type WikiPermissionRole,
} from "@sam-monorepo/permissions";
import { cache } from "react";

type WikiPermissionRoleWithName = WikiPermissionRole & {
  readonly name: string;
};

/**
 * Every role of the org, prepared for simulating wiki permissions role by
 * role. Deliberately unfiltered by the viewer's `otherRole;read` permission:
 * whoever manages a page has to see every role that can reach it, even ones
 * they may not browse elsewhere. Never use this to populate a role picker —
 * that is what `getVisibleRoles()` is for.
 */
export const getWikiPermissionRoles = cache(
  withTrace(
    "getWikiPermissionRoles",
    async (): Promise<WikiPermissionRoleWithName[]> => {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          permissionStrings: true,
          inherits: { select: { id: true, permissionStrings: true } },
        },
      });

      return roles
        .map((role) => ({
          id: role.id,
          name: role.name,
          /**
           * Same rule as `resolveEffectiveRoles()`: holding a role means
           * holding the roles it inherits. The level check doesn't apply here
           * — it depends on the individual assignment, not on the role.
           */
          effectiveRoleIds: [role.id, ...role.inherits.map(({ id }) => id)],
          hasWikiManage: comparePermissionSets(
            { resource: "wiki", operation: "manage" },
            getPermissionSetsByRoles([role, ...role.inherits]),
          ),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  ),
);
