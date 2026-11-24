import type { Prisma } from "@sam-monorepo/database/client";
import type { PermissionSet } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { findCitizensWithPermissions } from "./effectivePermissionsOfCitizens.js";

/** Each receiver of a notification must be able to log in */
export const LOGIN_MANAGE_PERMISSION_SET = {
  resource: "login",
  operation: "manage",
} as const satisfies PermissionSet;

/**
 * The conditions of the clearance page that the user row gives: a linked
 * user, not banned, a confirmed email
 */
export const CLEARANCE_USER_WHERE = {
  user: { is: { bannedAt: null, emailVerified: { not: null } } },
} as const satisfies Prisma.CitizenWhereInput;

/**
 * The citizens of `where` who pass the clearance page. No permission check: the
 * callers filter the receivers of notifications.
 */
export const findClearedCitizens = (
  context: Pick<ApplicationContext, "prisma">,
  where: Prisma.CitizenWhereInput,
) =>
  findCitizensWithPermissions(context, { AND: [where, CLEARANCE_USER_WHERE] }, [
    LOGIN_MANAGE_PERMISSION_SET,
  ]);
