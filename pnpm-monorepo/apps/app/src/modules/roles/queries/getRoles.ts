import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findAllRoleBadges,
  findInheritanceMatrixRoles,
  findPermissionMatrixRoles,
  findRoleTableRows,
  type RoleBadge,
} from "@sam-monorepo/application";
import { cache } from "react";

export type BadgeRole = RoleBadge;

/** A tag as the role picker shows it */
export interface BadgeRoleTag {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly icon: { readonly id: string; readonly mimeType: string } | null;
  /** The roles with this tag that the viewer can see */
  readonly roleIds: readonly BadgeRole["id"][];
}

/**
 * The badges of all roles. Prefer the wrappers in
 * `modules/roles/utils/getRoles.ts`: they apply the `otherRole;read`
 * permission of the viewer, which this query does not.
 */
export const getRoles = cache(
  withTrace("getRoles", () => findAllRoleBadges(getApplicationContext())),
);

/** The roles of the permission matrix. Requires `role;manage`. */
export const getRolesWithPermissionStrings = cache(
  withTrace("getRolesWithPermissionStrings", async () => {
    try {
      return await findPermissionMatrixRoles(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);

/** The roles of the inheritance matrix. Requires `role;manage`. */
export const getRolesWithInheritance = cache(
  withTrace("getRolesWithInheritance", async () => {
    try {
      return await findInheritanceMatrixRoles(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);

/** The rows of the role administration table. Requires `role;manage`. */
export const getRolesForTable = cache(
  withTrace("getRolesForTable", async () => {
    try {
      return await findRoleTableRows(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
