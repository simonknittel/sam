import { UserRole } from "@sam-monorepo/database/browser";
import {
  comparePermissionSets,
  transformPermissionStringToPermissionSet,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { ForbiddenError } from "./errors.js";

export interface ActorCitizen {
  readonly id: string;
  readonly handle: string | null;
}

/**
 * The user for whom a use case runs. The Next.js app builds the actor from
 * the session, the MCP server from the access token.
 */
export interface Actor {
  readonly userId: string;
  readonly userRole: UserRole | null;
  readonly emailConfirmedAt: Date | null;
  /** Null for a user without a citizen */
  readonly citizen: ActorCitizen | null;
  /**
   * The effective roles of the citizen (see `getEffectiveRolesOfCitizen()`).
   * Empty for a user without a citizen.
   */
  readonly roleIds: ReadonlySet<string>;
  /** The id of the Discord account of the user, or null without one */
  readonly discordUserId: string | null;
  readonly permissionSets: PermissionSet[];
  /** True only for an admin who enabled admin mode */
  readonly adminMode: boolean;
  readonly authorize: (
    resource: PermissionSet["resource"],
    operation: PermissionSet["operation"],
    attributes?: PermissionSet["attributes"],
  ) => boolean;
  /**
   * Whether the user can use the app: a confirmed email (admin mode skips
   * it) and `login;manage`. The same gate as the pages, the API routes and
   * the server actions.
   */
  readonly hasClearance: () => boolean;
  /** Throws a `ForbiddenError` when `hasClearance()` is false */
  readonly requireClearance: () => void;
}

export type ActorFields = Omit<
  Actor,
  "authorize" | "hasClearance" | "requireClearance"
>;

/**
 * Builds the actor. `adminMode` applies only to an admin. The caller resolves
 * the admin mode before (for example from the cookie of the admin toolbar),
 * thus `authorize()` is synchronous.
 */
export const createActor = (fields: ActorFields): Actor => {
  const adminMode = fields.adminMode && fields.userRole === UserRole.ADMIN;

  const authorize: Actor["authorize"] = (resource, operation, attributes) => {
    if (adminMode) return operation !== "negate";

    return comparePermissionSets(
      { resource, operation, attributes },
      fields.permissionSets,
    );
  };

  // Admin mode skips the email confirmation, like the gate of the app
  const hasConfirmedEmail = () => adminMode || fields.emailConfirmedAt !== null;

  return {
    ...fields,
    adminMode,
    authorize,
    hasClearance: () => hasConfirmedEmail() && authorize("login", "manage"),
    requireClearance: () => {
      if (!hasConfirmedEmail())
        throw new ForbiddenError("The email address is not confirmed");

      if (!authorize("login", "manage"))
        throw new ForbiddenError("The user has no clearance");
    },
  };
};

/** Throws a `ForbiddenError` when the actor does not have the permission */
export const requirePermission = (
  actor: Actor,
  resource: PermissionSet["resource"],
  operation: PermissionSet["operation"],
  attributes?: PermissionSet["attributes"],
) => {
  if (!actor.authorize(resource, operation, attributes))
    throw new ForbiddenError(
      `The permission ${resource};${operation} is missing`,
    );
};

/**
 * Whether the actor has at least one of the permission strings. An absent or
 * empty list means that no permission is necessary. The app catalog and the
 * onboarding read their required permissions as permission strings.
 */
export const satisfiesAnyPermissionString = (
  actor: Actor,
  permissionStrings: readonly string[] | undefined,
): boolean => {
  if (!permissionStrings || permissionStrings.length === 0) return true;

  return permissionStrings.some((permissionString) => {
    const permissionSet =
      transformPermissionStringToPermissionSet(permissionString);

    return actor.authorize(
      permissionSet.resource,
      permissionSet.operation,
      permissionSet.attributes,
    );
  });
};

/**
 * Throws a `ForbiddenError` when the user has no citizen. The features that
 * show the own participations, assignments or applications need one.
 */
export const requireCitizen = (actor: Actor): ActorCitizen => {
  if (!actor.citizen) throw new ForbiddenError("The user has no citizen");

  return actor.citizen;
};
