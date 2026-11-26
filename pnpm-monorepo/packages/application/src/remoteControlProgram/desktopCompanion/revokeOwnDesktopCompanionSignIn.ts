import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { NotFoundError } from "../../errors.js";
import { getDesktopCompanionClientId } from "../../oauth/desktopCompanionClient.js";
import { revokeGrant } from "../../oauth/revokeGrant.js";
import { idSchema } from "../../pagination.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramCitizen } from "../access/remoteControlProgramPermissions.js";

export const revokeOwnDesktopCompanionSignInInputSchema = z.object({
  grant_id: idSchema,
});

export type RevokeOwnDesktopCompanionSignInInput = z.output<
  typeof revokeOwnDesktopCompanionSignInInputSchema
>;

export interface RevokeOwnDesktopCompanionSignInOutput {
  /** False when the sign-in had ended already: nothing changed */
  readonly isChanged: boolean;
}

/**
 * The sign-out of one desktop companion of the actor: the revocation of its
 * OAuth grant (`OAUTH_GRANT_REVOKED`). The program then gets no new tokens,
 * and the relay service closes its connection at the next token renewal (see
 * `authenticateRuntimeConnection()`), at the latest when the connection token
 * expires. It needs no permission, like the list.
 *
 * @throws ForbiddenError without a citizen, or for an admin who assumes the
 * user (`RemoteControlProgramErrorMessage`)
 * @throws NotFoundError when the actor has no sign-in of the desktop
 * companion with the id
 * (`RemoteControlProgramErrorMessage.DesktopCompanionSignInNotFound`)
 */
export const revokeOwnDesktopCompanionSignIn = (
  context: ApplicationContext,
  actor: Actor,
  input: RevokeOwnDesktopCompanionSignInInput,
): Promise<RevokeOwnDesktopCompanionSignInOutput> =>
  withSpan(context, "revokeOwnDesktopCompanionSignIn", async () => {
    requireRemoteControlProgramCitizen(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: {
        id: input.grant_id,
        userId: actor.userId,
        clientId: getDesktopCompanionClientId(context),
      },
      select: { id: true, clientId: true, revokedAt: true },
    });
    if (!grant)
      throw new NotFoundError(
        RemoteControlProgramErrorMessage.DesktopCompanionSignInNotFound,
      );

    if (grant.revokedAt) return { isChanged: false };

    return {
      isChanged: await revokeGrant(context, {
        grantId: grant.id,
        clientId: grant.clientId,
        revokedById: actor.userId,
        auditCreatedById: actor.userId,
      }),
    };
  });
