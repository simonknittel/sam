import { UserRole } from "@sam-monorepo/database/browser";
import {
  comparePermissionSets,
  isMissingTwoFactorAuthentication,
  transformPermissionStringToPermissionSet,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { ForbiddenError } from "./errors.js";

export interface ActorCitizen {
  readonly id: string;
  readonly handle: string | null;
}

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
  readonly discordUserId: string | null;
  /**
   * The two-factor authentication of the Discord account of the person
   * behind the request (see `isMissingTwoFactorAuthentication()`)
   */
  readonly discordTwoFactorEnabled: boolean | null;
  readonly permissionSets: PermissionSet[];
  /** True only for an admin who enabled admin mode */
  readonly adminMode: boolean;
  /**
   * The id of the admin behind the session when the admin assumes this user
   * (the admin toolbar of the app). Null for the own session of the user, and
   * for the hosts that cannot assume a user.
   */
  readonly assumedByAdminId: string | null;
  readonly authorize: (
    resource: PermissionSet["resource"],
    operation: PermissionSet["operation"],
    attributes?: PermissionSet["attributes"],
  ) => boolean;
  /**
   * Whether the user can use the app: a confirmed email (admin mode skips
   * it), `login;manage` and the two-factor authentication that some
   * permissions require. The same gate as the pages, the API routes and the
   * server actions.
   */
  readonly hasClearance: () => boolean;
  /** Throws a `ForbiddenError` when `hasClearance()` is false */
  readonly requireClearance: () => void;
}

/**
 * Only the session of the app can assume a user, thus the other hosts leave
 * out `assumedByAdminId`
 */
export type ActorFields = Omit<
  Actor,
  "authorize" | "hasClearance" | "requireClearance" | "assumedByAdminId"
> &
  Partial<Pick<Actor, "assumedByAdminId">>;

/**
 * `adminMode` applies only to an admin. The caller resolves the admin mode
 * before (for example from the cookie of the admin toolbar), thus
 * `authorize()` is synchronous.
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

  // Admin mode does not skip it: an admin always requires it
  const hasTwoFactorAuthentication = () =>
    !isMissingTwoFactorAuthentication(fields);

  return {
    ...fields,
    adminMode,
    assumedByAdminId: fields.assumedByAdminId ?? null,
    authorize,
    hasClearance: () =>
      hasConfirmedEmail() &&
      authorize("login", "manage") &&
      hasTwoFactorAuthentication(),
    requireClearance: () => {
      if (!hasConfirmedEmail())
        throw new ForbiddenError("The email address is not confirmed");

      if (!authorize("login", "manage"))
        throw new ForbiddenError("The user has no clearance");

      if (!hasTwoFactorAuthentication())
        throw new ForbiddenError(
          "The Discord account has no two-factor authentication",
        );
    },
  };
};

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
 * Admin mode is not necessary, and no role permission replaces the admin role
 */
export const requireAdmin = (actor: Actor) => {
  if (actor.userRole !== UserRole.ADMIN)
    throw new ForbiddenError("The user is not an admin");
};

/** An absent or empty list means that no permission is necessary */
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

export const requireCitizen = (actor: Actor): ActorCitizen => {
  if (!actor.citizen) throw new ForbiddenError("The user has no citizen");

  return actor.citizen;
};
