import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { getDesktopCompanionClientId } from "../oauth/desktopCompanionClient.js";

/**
 * The grants of the app KI-Agenten: the grants of the MCP server of the actor
 * that are not revoked. The sharing popover has the grants of the desktop
 * companion (see `listOwnDesktopCompanionSignIns()`).
 */
export const getOwnMcpGrantWhere = (
  context: Pick<ApplicationContext, "urls">,
  actor: Pick<Actor, "userId">,
) =>
  ({
    userId: actor.userId,
    revokedAt: null,
    clientId: { not: getDesktopCompanionClientId(context) },
  }) satisfies Prisma.OAuthGrantWhereInput;
