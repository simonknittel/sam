import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import { getEffectiveRolesOfCitizen } from "../auth/getEffectiveRolesOfCitizen.js";
import { createUserActor, USER_ACTOR_SELECT } from "../auth/userActor.js";
import type { ApplicationContext } from "../context.js";
import { getOAuthResourceOfClient, OAuthResource } from "./resources.js";

export const GRANT_ACTOR_SELECT = {
  userId: true,
  clientId: true,
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
 * The requests with an access token and the token endpoint use the same
 * actor. The permissions are the own roles of the user, like in the session
 * of the app. Admin mode applies when a grant of the MCP server has it and
 * the user is an admin. The desktop companion never has admin mode (see
 * `toOAuthResourceActor()`).
 */
export const createGrantActor = async (
  context: ApplicationContext,
  grant: GrantWithActorFields,
): Promise<Actor> => {
  const { userId, user } = grant;
  const isMcpGrant =
    getOAuthResourceOfClient(context, grant.clientId) === OAuthResource.Mcp;

  return createUserActor({
    userId,
    user,
    citizen: user.citizen,
    effectiveRoles: user.citizen
      ? await getEffectiveRolesOfCitizen(context.prisma, user.citizen.id)
      : null,
    adminMode: isMcpGrant && grant.adminModeEnabledAt !== null,
  });
};
