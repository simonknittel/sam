import type { Prisma } from "@sam-monorepo/database/client";
import { createActor, type Actor, type ActorCitizen } from "../actor.js";
import type { EffectiveRoles } from "./getEffectiveRolesOfCitizen.js";

/** The columns of the user that `createUserActor()` reads */
export const USER_ACTOR_SELECT = {
  role: true,
  emailVerified: true,
  discordTwoFactorEnabled: true,
  // The same account as the `discordId` of the session of the app
  accounts: {
    where: { provider: "discord" },
    select: { providerAccountId: true },
    take: 1,
  },
} as const satisfies Prisma.UserSelect;

interface UserActorFields {
  readonly userId: string;
  readonly user: Prisma.UserGetPayload<{ select: typeof USER_ACTOR_SELECT }>;
  readonly citizen: ActorCitizen | null;
  /** Null for a user without a citizen or without a role */
  readonly effectiveRoles: Pick<
    EffectiveRoles,
    "roleIds" | "permissionSets"
  > | null;
  /** `createActor()` applies admin mode only to an admin */
  readonly adminMode: boolean;
}

/**
 * The actor of a host without the session of the app (the MCP server, the
 * relay service). The permissions are the own roles of the user, like in the
 * session. The caller checks the ban, and that the citizen is not deleted.
 */
export const createUserActor = ({
  userId,
  user,
  citizen,
  effectiveRoles,
  adminMode,
}: UserActorFields): Actor =>
  createActor({
    userId,
    userRole: user.role,
    emailConfirmedAt: user.emailVerified,
    citizen: citizen && { id: citizen.id, handle: citizen.handle },
    roleIds: effectiveRoles?.roleIds ?? new Set(),
    discordUserId: user.accounts[0]?.providerAccountId ?? null,
    discordTwoFactorEnabled: user.discordTwoFactorEnabled,
    permissionSets: effectiveRoles?.permissionSets ?? [],
    adminMode,
  });
