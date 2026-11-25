import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import { getEffectiveRolesOfCitizen } from "../auth/getEffectiveRolesOfCitizen.js";
import { createUserActor, USER_ACTOR_SELECT } from "../auth/userActor.js";
import type { ApplicationContext } from "../context.js";

export const GRANT_ACTOR_SELECT = {
  userId: true,
  adminModeEnabledAt: true,
  user: {
    select: {
      ...USER_ACTOR_SELECT,
      bannedAt: true,
      citizen: { select: { id: true, handle: true } },
    },
  },
} as const satisfies Prisma.OAuthGrantSelect;

type GrantWithActorFields = Prisma.OAuthGrantGetPayload<{
  select: typeof GRANT_ACTOR_SELECT;
}>;

/**
 * The MCP requests and the token endpoint use the same actor. The permissions
 * are the own roles of the user, like in the session of the app. Admin mode
 * applies when the grant has it and the user is an admin.
 */
export const createGrantActor = async (
  context: ApplicationContext,
  grant: GrantWithActorFields,
): Promise<Actor> => {
  const { userId, user } = grant;

  return createUserActor({
    userId,
    user,
    citizen: user.citizen,
    effectiveRoles: user.citizen
      ? await getEffectiveRolesOfCitizen(context.prisma, user.citizen.id)
      : null,
    adminMode: grant.adminModeEnabledAt !== null,
  });
};
