import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findAssignableRoleBadges,
  findOwnAssignedRoleBadges,
  findPickerRoleTagBadges,
  findVisibleRoleBadges,
} from "@sam-monorepo/application";
import type { RoleAssignment } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getVisibleRoles = cache(
  withTrace("getVisibleRoles", async () =>
    findVisibleRoleBadges(getApplicationContext(), await getRequestActor()),
  ),
);

export const getVisibleRoleTags = cache(
  withTrace("getVisibleRoleTags", async () =>
    findPickerRoleTagBadges(getApplicationContext(), await getRequestActor()),
  ),
);

/**
 * The level comes from the assignments of the citizen, thus the roles never
 * carry an assignment row for each citizen.
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

/** Only the career flows need the inheritance */
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

export const getAssignableRoles = cache(
  withTrace("getAssignableRoles", async () =>
    findAssignableRoleBadges(getApplicationContext(), await getRequestActor()),
  ),
);
