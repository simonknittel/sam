import { runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { verifyAccessToken } from "../../oauth/accessToken.js";
import { resolvePrincipal } from "../../oauth/resolvePrincipal.js";
import { OAuthResource } from "../../oauth/resources.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { signRuntimeConnectionToken } from "./connectionToken.js";

export const issueRuntimeConnectionTokenInputSchema = z.object({
  runtime_id: runtimeIdSchema.describe(
    "The id that the runtime makes once and keeps",
  ),
});

export type IssueRuntimeConnectionTokenInput = z.output<
  typeof issueRuntimeConnectionTokenInputSchema
>;

export interface IssueRuntimeConnectionTokenOutput {
  /** For the `hello` or the `token_renewal`. Never log it. */
  readonly token: string;
  readonly expiresAt: Date;
  /**
   * The WebSocket URL of the relay service. Null when the host has no relay
   * service: then the browser runtime works only on the machine.
   */
  readonly relayUrl: string | null;
  /** The handle of the citizen, the owner of the runtime */
  readonly handle: string | null;
}

const issueToken = async (
  context: ApplicationContext,
  actor: Actor,
  input: IssueRuntimeConnectionTokenInput,
  oauthGrantId: string | null,
): Promise<IssueRuntimeConnectionTokenOutput> => {
  const citizen = requireRemoteControlProgramUse(actor);

  const user = await context.prisma.user.findUnique({
    where: { id: actor.userId },
    select: { bannedAt: true },
  });
  if (!user)
    throw new ForbiddenError(RemoteControlProgramErrorMessage.UserNotFound);
  if (user.bannedAt)
    throw new ForbiddenError(RemoteControlProgramErrorMessage.UserBanned);

  const { token, expiresAt } = await signRuntimeConnectionToken(context, {
    userId: actor.userId,
    citizenId: citizen.id,
    runtimeId: input.runtime_id,
    adminMode: actor.adminMode,
    oauthGrantId,
  });

  return {
    token,
    expiresAt,
    relayUrl: context.relay?.webSocketUrl.href ?? null,
    handle: citizen.handle,
  };
};

/**
 * A short-lived token for one connection of a runtime of the actor to the
 * relay service. The runtime asks for a token for each connection and for
 * each renewal (see `RELAY_LIMITS.tokenRenewalIntervalMilliseconds`). The
 * caller does the gate of the app (`actor.requireClearance()`). The relay
 * service accepts the token only for a browser runtime (see
 * `authenticateRuntimeConnection()`).
 *
 * @throws ForbiddenError without a citizen, without `remoteControlProgram;use`,
 * for a banned user, or for an admin who assumes the user: the runtime would
 * upload the log of the admin as the data of the user
 * @throws ConflictError when the host has no signing key
 * (`RemoteControlProgramErrorMessage.TokenKeyNotConfigured`)
 */
export const issueRuntimeConnectionToken = (
  context: ApplicationContext,
  actor: Actor,
  input: IssueRuntimeConnectionTokenInput,
): Promise<IssueRuntimeConnectionTokenOutput> =>
  withSpan(context, "issueRuntimeConnectionToken", () =>
    issueToken(context, actor, input, null),
  );

/**
 * The connection token of the desktop companion, for its OAuth access token
 * of the Remote Control Program. The token contains the id of the grant and
 * no admin mode (decision 35 of the Remote Control Program). The relay
 * service accepts it only for a desktop companion.
 *
 * @throws InvalidTokenError when the access token is not valid, is for a
 * different resource, or its grant is revoked, or the user is banned
 * @throws SigningKeyUnavailableError when the host has no signing key
 * @throws ForbiddenError without the clearance of the app, a citizen or
 * `remoteControlProgram;use`
 */
export const issueDesktopCompanionConnectionToken = (
  context: ApplicationContext,
  accessToken: string,
  input: IssueRuntimeConnectionTokenInput,
): Promise<IssueRuntimeConnectionTokenOutput> =>
  withSpan(context, "issueDesktopCompanionConnectionToken", async () => {
    const { actor, grant } = await resolvePrincipal(
      context,
      await verifyAccessToken(
        context,
        accessToken,
        OAuthResource.RemoteControlProgram,
      ),
    );

    return issueToken(context, actor, input, grant.id);
  });
