import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

/**
 * Each consent gives a new grant. This limit is far above the number of
 * clients that one person connects, and it keeps the list bounded.
 */
const MAXIMUM_GRANTS = 100;

/** A connected client of the user */
export interface OwnGrant {
  readonly id: string;
  /** The URL of the Client ID Metadata Document */
  readonly clientId: string;
  /**
   * The host of the client id: the only trusted identity of the client. The
   * consent page shows the same value.
   */
  readonly clientHost: string;
  /** The client gives its name itself, thus the name is not trusted */
  readonly clientName: string;
  /** The name that the user gave the client */
  readonly customName: string | null;
  readonly redirectHost: string;
  /** The user agent of the browser that gave the consent */
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
  /** Admin mode applies only when this is set and the user is an admin */
  readonly adminModeEnabledAt: Date | null;
  /** The tools that the user disabled for this client, sorted by the name */
  readonly disabledToolNames: string[];
}

/**
 * The grants of the actor that are not revoked, the newest grant first. A
 * grant has a refresh token from the redemption of its authorization code
 * until its revocation or the expiry of its tokens. Thus the list does not
 * show a grant whose code the client did not redeem, for example after an
 * abandoned authorization.
 */
export const listOwnGrants = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnGrant[]> => {
  const grants = await context.prisma.oAuthGrant.findMany({
    where: {
      userId: actor.userId,
      revokedAt: null,
      refreshTokens: { some: {} },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAXIMUM_GRANTS,
    select: {
      id: true,
      clientId: true,
      clientName: true,
      customName: true,
      redirectHost: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      adminModeEnabledAt: true,
      toolSettings: {
        select: { toolName: true },
        orderBy: { toolName: "asc" },
      },
    },
  });

  return grants.map((grant) => ({
    id: grant.id,
    clientId: grant.clientId,
    clientHost: new URL(grant.clientId).host,
    clientName: grant.clientName,
    customName: grant.customName,
    redirectHost: grant.redirectHost,
    userAgent: grant.userAgent,
    createdAt: grant.createdAt,
    lastUsedAt: grant.lastUsedAt,
    adminModeEnabledAt: grant.adminModeEnabledAt,
    disabledToolNames: grant.toolSettings.map((setting) => setting.toolName),
  }));
};
