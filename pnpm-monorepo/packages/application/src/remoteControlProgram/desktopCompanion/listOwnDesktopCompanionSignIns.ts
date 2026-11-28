import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { getDesktopCompanionClientId } from "../../oauth/desktopCompanionClient.js";
import { withSpan } from "../../withSpan.js";
import { requireRemoteControlProgramCitizen } from "../access/remoteControlProgramPermissions.js";

/**
 * Each login of the program makes a new grant. This limit is far above the
 * number of machines of one person, and it keeps the list bounded.
 */
const MAXIMUM_SIGN_INS = 100;

/** An OAuth grant of the desktop companion */
export interface DesktopCompanionSignIn {
  readonly id: string;
  /** The user agent of the browser of the consent: it tells the device */
  readonly userAgent: string | null;
  /** The time of the consent */
  readonly createdAt: Date;
  /**
   * The last token request or connection token, at most one update in each
   * hour (see `resolvePrincipal()`)
   */
  readonly lastUsedAt: Date | null;
}

export interface OwnDesktopCompanionSignIns {
  /** The newest first */
  readonly signIns: DesktopCompanionSignIn[];
}

/**
 * The sign-ins of the desktop companion of the actor, for the sharing
 * popover. Like the list of the app KI-Agenten, it has only the grants with a
 * refresh token: not an abandoned login, and not a grant whose tokens
 * expired. It needs no permission of its own. The sharing popover shows the
 * list only with `remoteControlProgram;use` (see `getSharingPopover()` of
 * the app). Without this permission, a sign-in gives no token and no
 * connection, and the midnight cleanup removes it when its refresh token
 * expired.
 *
 * @throws ForbiddenError without a citizen, or for an admin who assumes the
 * user (`RemoteControlProgramErrorMessage`)
 */
export const listOwnDesktopCompanionSignIns = (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnDesktopCompanionSignIns> =>
  withSpan(context, "listOwnDesktopCompanionSignIns", async () => {
    requireRemoteControlProgramCitizen(actor);

    const signIns = await context.prisma.oAuthGrant.findMany({
      where: {
        userId: actor.userId,
        clientId: getDesktopCompanionClientId(context),
        revokedAt: null,
        refreshTokens: { some: {} },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAXIMUM_SIGN_INS,
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });

    return { signIns };
  });
