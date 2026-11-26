import { UserRole } from "@sam-monorepo/database/browser";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import type { VerifiedAccessToken } from "./accessToken.js";
import { InvalidTokenError } from "./errors.js";
import { createGrantActor, GRANT_ACTOR_SELECT } from "./grantActor.js";
import { resetStaleGrantAdminModes } from "./resetStaleGrantAdminModes.js";
import {
  getOAuthResourceOfClient,
  requireOAuthResourceUse,
} from "./resources.js";

/**
 * The requests with an access token update `lastUsedAt` of a grant at most
 * one time in this interval
 */
const LAST_USED_AT_INTERVAL_IN_MILLISECONDS = 60 * 60 * 1000;

export interface PrincipalGrant {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly createdAt: Date;
  readonly adminModeEnabledAt: Date | null;
  readonly disabledToolNames: string[];
}

export interface Principal {
  readonly actor: Actor;
  readonly grant: PrincipalGrant;
}

/**
 * The principal of a request with an access token of `verifyAccessToken()`:
 * the MCP endpoint, or the connection token route of the desktop companion
 *
 * @throws InvalidTokenError when the grant is revoked or the user is banned
 * @throws ForbiddenError when the user does not have the clearance of the app
 * or the permission of the resource (see `requireOAuthResourceUse()`)
 */
export const resolvePrincipal = (
  context: ApplicationContext,
  token: VerifiedAccessToken,
): Promise<Principal> =>
  withSpan(context, "resolvePrincipal", async () => {
    const grant = await context.prisma.oAuthGrant.findUnique({
      where: { id: token.grantId },
      select: {
        ...GRANT_ACTOR_SELECT,
        id: true,
        clientId: true,
        clientName: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
        toolSettings: { select: { toolName: true } },
      },
    });

    if (
      !grant ||
      grant.revokedAt ||
      grant.userId !== token.userId ||
      grant.clientId !== token.clientId ||
      getOAuthResourceOfClient(context, grant.clientId) !== token.oauthResource
    )
      throw new InvalidTokenError("The grant of the access token is revoked");

    if (grant.user.bannedAt) throw new InvalidTokenError("The user is banned");

    const hasStaleAdminMode =
      grant.adminModeEnabledAt !== null && grant.user.role !== UserRole.ADMIN;
    if (hasStaleAdminMode)
      await resetStaleGrantAdminModes(context, { id: grant.id });

    const actor = await createGrantActor(context, grant);

    actor.requireClearance();
    requireOAuthResourceUse(actor, token.oauthResource);

    const now = context.now();
    const lastUsedAtThreshold = new Date(
      now.getTime() - LAST_USED_AT_INTERVAL_IN_MILLISECONDS,
    );
    if (!grant.lastUsedAt || grant.lastUsedAt < lastUsedAtThreshold)
      // The condition makes parallel requests write only one time
      await context.prisma.oAuthGrant.updateMany({
        where: {
          id: grant.id,
          OR: [
            { lastUsedAt: null },
            { lastUsedAt: { lt: lastUsedAtThreshold } },
          ],
        },
        data: { lastUsedAt: now },
      });

    return {
      actor,
      grant: {
        id: grant.id,
        clientId: grant.clientId,
        clientName: grant.clientName,
        createdAt: grant.createdAt,
        adminModeEnabledAt: hasStaleAdminMode ? null : grant.adminModeEnabledAt,
        disabledToolNames: grant.toolSettings.map(
          (setting) => setting.toolName,
        ),
      },
    };
  });
