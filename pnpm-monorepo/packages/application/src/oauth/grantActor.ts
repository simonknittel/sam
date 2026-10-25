import type { Prisma } from "@sam-monorepo/database/client";
import { createActor, type Actor } from "../actor.js";
import { getEffectiveRolesOfCitizen } from "../auth/getEffectiveRolesOfCitizen.js";
import type { ApplicationContext } from "../context.js";

/** What a grant needs for the actor of its user */
export const GRANT_ACTOR_SELECT = {
  userId: true,
  adminModeEnabledAt: true,
  user: {
    select: {
      role: true,
      emailVerified: true,
      bannedAt: true,
      discordTwoFactorEnabled: true,
      citizen: { select: { id: true, handle: true } },
      // The same account as the `discordId` of the session of the app
      accounts: {
        where: { provider: "discord" },
        select: { providerAccountId: true },
        take: 1,
      },
    },
  },
} as const satisfies Prisma.OAuthGrantSelect;

type GrantWithActorFields = Prisma.OAuthGrantGetPayload<{
  select: typeof GRANT_ACTOR_SELECT;
}>;

/**
 * The actor of the user of a grant. The permissions are the own roles of
 * the user, like in the session of the app. Admin mode applies when the
 * grant has it and the user is an admin. The MCP requests and the token
 * endpoint use the same actor.
 */
export const createGrantActor = async (
  context: ApplicationContext,
  grant: GrantWithActorFields,
): Promise<Actor> => {
  const { user } = grant;
  const effectiveRoles = user.citizen
    ? await getEffectiveRolesOfCitizen(context.prisma, user.citizen.id)
    : null;

  return createActor({
    userId: grant.userId,
    userRole: user.role,
    emailConfirmedAt: user.emailVerified,
    citizen: user.citizen,
    roleIds: effectiveRoles?.roleIds ?? new Set(),
    discordUserId: user.accounts[0]?.providerAccountId ?? null,
    discordTwoFactorEnabled: user.discordTwoFactorEnabled,
    permissionSets: effectiveRoles?.permissionSets ?? [],
    // `createActor()` applies admin mode only to an admin
    adminMode: grant.adminModeEnabledAt !== null,
  });
};
