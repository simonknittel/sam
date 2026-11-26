import {
  connectionTokenSchema,
  runtimeIdSchema,
  RuntimeKind,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import { getEffectiveRolesOfCitizen } from "../../auth/getEffectiveRolesOfCitizen.js";
import { createUserActor, USER_ACTOR_SELECT } from "../../auth/userActor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { isDesktopCompanionClientId } from "../../oauth/desktopCompanionClient.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  verifyRuntimeConnectionToken,
  type VerifiedRuntimeConnectionToken,
} from "./connectionToken.js";

export const authenticateRuntimeConnectionInputSchema = z.object({
  /** The token of the `hello` or of the `token_renewal` */
  token: connectionTokenSchema,
  /** The id of the `hello` of the connection */
  runtime_id: runtimeIdSchema,
  /** The kind of the `hello` of the connection */
  runtime_kind: z.enum(RuntimeKind),
});

export type AuthenticateRuntimeConnectionInput = z.output<
  typeof authenticateRuntimeConnectionInputSchema
>;

export interface RuntimeConnection {
  /**
   * The actor of the use cases of the connection. Admin mode comes from the
   * token, because the relay service has no session. This use case applies it
   * only to an admin.
   */
  readonly actor: Actor;
  readonly userId: string;
  /** The owner of the runtime */
  readonly citizenId: string;
  readonly runtimeId: string;
  readonly runtimeKind: RuntimeKind;
  /**
   * The relay service closes the connection at this time plus
   * `RELAY_LIMITS.tokenRenewalGraceMilliseconds` without a renewal
   */
  readonly tokenExpiresAt: Date;
}

/**
 * The kind of the runtime must agree with the source of the token: only the
 * desktop companion gets a token from an OAuth grant, and only the browser
 * runtime gets a token from a session of the app
 */
const isTokenForRuntimeKind = (
  token: VerifiedRuntimeConnectionToken,
  runtimeKind: RuntimeKind,
) => {
  switch (runtimeKind) {
    case RuntimeKind.browser:
      return token.oauthGrantId === null;
    case RuntimeKind.desktop_companion:
      return token.oauthGrantId !== null;
    default:
      throw new Error(`Unknown runtime kind: ${runtimeKind satisfies never}`);
  }
};

/**
 * @throws ForbiddenError with `RemoteControlProgramErrorMessage.OAuthGrantRevoked`
 * when the grant does not exist any more, is revoked, or is not a grant of
 * the desktop companion of the user
 */
const requireActiveOAuthGrant = async (
  context: ApplicationContext,
  { oauthGrantId, userId }: VerifiedRuntimeConnectionToken,
) => {
  if (oauthGrantId === null) return;

  const grant = await context.prisma.oAuthGrant.findUnique({
    where: { id: oauthGrantId },
    select: { userId: true, clientId: true, revokedAt: true },
  });
  if (
    !grant ||
    grant.revokedAt ||
    grant.userId !== userId ||
    !isDesktopCompanionClientId(context, grant.clientId)
  )
    throw new ForbiddenError(
      RemoteControlProgramErrorMessage.OAuthGrantRevoked,
    );
};

/**
 * Checks the token of a runtime connection: at the `hello` and at each
 * `token_renewal`. It verifies the token and its runtime kind, and then
 * checks in the database that the OAuth grant of a desktop companion is not
 * revoked, and that the user is not banned, has the clearance of the app,
 * still has the citizen of the token and still has
 * `remoteControlProgram;use` (or admin mode). The actor of the connection
 * stays the same until the next renewal. A revocation, a ban, a removed
 * permission or the end of admin mode thus applies at the next renewal, and
 * at the latest when the relay service closes the connection without a
 * renewal.
 * The relay service has no session: the use case builds the actor of the
 * connection, like the MCP server builds it from an access token.
 *
 * @throws ForbiddenError with `RemoteControlProgramErrorMessage.ConnectionTokenNotValid`
 * when the token is not valid, or is for a different runtime, runtime kind
 * or citizen. The relay service closes with `token_not_valid`.
 * @throws ForbiddenError with a different message when the OAuth grant is
 * revoked or the user cannot use the Remote Control Program (banned, deleted,
 * no citizen, no clearance, no permission). The relay service closes with
 * `access_denied`.
 * @throws ConflictError when the host has no key to verify the token
 * @throws KeySetUnavailableError when the key set of the app cannot be read.
 * The relay service closes with the code 1011 and logs an error.
 */
export const authenticateRuntimeConnection = (
  context: ApplicationContext,
  input: AuthenticateRuntimeConnectionInput,
): Promise<RuntimeConnection> =>
  withSpan(context, "authenticateRuntimeConnection", async () => {
    const token = await verifyRuntimeConnectionToken(context, input.token);
    if (
      token.runtimeId !== input.runtime_id ||
      !isTokenForRuntimeKind(token, input.runtime_kind)
    )
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
      );

    await requireActiveOAuthGrant(context, token);

    const user = await context.prisma.user.findUnique({
      where: { id: token.userId },
      select: {
        ...USER_ACTOR_SELECT,
        bannedAt: true,
        citizen: { select: { id: true, handle: true, deletedAt: true } },
      },
    });
    if (!user)
      throw new ForbiddenError(RemoteControlProgramErrorMessage.UserNotFound);
    if (user.bannedAt)
      throw new ForbiddenError(RemoteControlProgramErrorMessage.UserBanned);

    const citizen =
      user.citizen && user.citizen.deletedAt === null ? user.citizen : null;
    if (!citizen)
      throw new ForbiddenError(RemoteControlProgramErrorMessage.CitizenMissing);
    // The user has a different citizen now: the runtime gets a new token
    if (citizen.id !== token.citizenId)
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
      );

    const actor = createUserActor({
      userId: token.userId,
      user,
      citizen,
      effectiveRoles: await getEffectiveRolesOfCitizen(
        context.prisma,
        citizen.id,
      ),
      adminMode: token.adminMode,
    });

    actor.requireClearance();
    requireRemoteControlProgramUse(actor);

    return {
      actor,
      userId: token.userId,
      citizenId: citizen.id,
      runtimeId: token.runtimeId,
      runtimeKind: input.runtime_kind,
      tokenExpiresAt: token.expiresAt,
    };
  });
