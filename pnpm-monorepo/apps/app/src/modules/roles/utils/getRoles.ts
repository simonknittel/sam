import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findAssignableRoleBadges,
  findOwnAssignedRoleBadges,
  findVisibleRoleBadges,
  findVisibleRoleTagBadges,
} from "@sam-monorepo/application";
import type { RoleAssignment } from "@sam-monorepo/database/client";
import { cache } from "react";

/** The badges of the roles that the viewer can see, sorted by name */
export const getVisibleRoles = cache(
  withTrace("getVisibleRoles", async () =>
    findVisibleRoleBadges(getApplicationContext(), await getRequestActor()),
  ),
);

/**
 * The tags that the viewer can see, each with the ids of its visible roles,
 * sorted by name. The role picker shows them.
 */
export const getVisibleRoleTags = cache(
  withTrace("getVisibleRoleTags", async () =>
    findVisibleRoleTagBadges(getApplicationContext(), await getRequestActor()),
  ),
);

/**
 * The visible roles of one citizen, each with the level of that citizen.
 * The level comes from the assignments of the citizen, thus the roles never
 * have to carry an assignment row for each citizen.
 */
export const getAssignedRoles = cache(
  async (entity: {
    readonly roleAssignments: readonly Pick<
      RoleAssignment,
      "roleId" | "currentLevel"
    >[];
  }) => {
    const visibleRoles = await getVisibleRoles();

    return visibleRoles.flatMap((role) => {
      const assignment = entity.roleAssignments.find(
        (assignment) => assignment.roleId === role.id,
      );
      if (!assignment) return [];

      return [{ ...role, currentLevel: assignment.currentLevel }];
    });
  },
);

/**
 * The visible roles of the viewer, each with the ids of the roles that it
 * inherits. Only the career flows need the inheritance.
 */
export const getMyAssignedRolesWithInheritance = cache(
  withTrace("getMyAssignedRolesWithInheritance", async () => {
    try {
      return await findOwnAssignedRoleBadges(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);

/** The visible roles that the viewer can give to a citizen or take away */
export const getAssignableRoles = cache(
  withTrace("getAssignableRoles", async () =>
    findAssignableRoleBadges(getApplicationContext(), await getRequestActor()),
  ),
);
