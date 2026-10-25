import { getEffectiveRoles } from "@/modules/auth/server";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { createActor, type Actor } from "@sam-monorepo/application";
import type { Session } from "next-auth";

/**
 * Maps the session to the actor of the use cases. The session already holds
 * the citizen, the Discord id and the permissions of an assumed user, and
 * `isAdminModeActive()` reads the cookie of the admin toolbar. The effective
 * roles come from the cache of the request, which the session callback
 * filled.
 */
export const toActor = async (session: Session): Promise<Actor> => {
  const [adminMode, effectiveRoles] = await Promise.all([
    isAdminModeActive(session),
    session.entity ? getEffectiveRoles(session.entity.id) : null,
  ]);

  return createActor({
    userId: session.user.id,
    userRole: session.user.role,
    emailConfirmedAt: session.user.emailVerified,
    citizen: session.entity
      ? { id: session.entity.id, handle: session.entity.handle }
      : null,
    roleIds: effectiveRoles?.roleIds ?? new Set(),
    discordUserId: session.discordId,
    discordTwoFactorEnabled: session.discordTwoFactorEnabled,
    permissionSets: session.givenPermissionSets,
    adminMode,
  });
};
