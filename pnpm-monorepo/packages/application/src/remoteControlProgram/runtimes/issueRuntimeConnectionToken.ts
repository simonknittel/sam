import { runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
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
}

/**
 * A short-lived token for one connection of a runtime of the actor to the
 * relay service. The runtime asks for a token for each connection and for
 * each renewal (see `RELAY_LIMITS.tokenRenewalIntervalMilliseconds`). The
 * caller does the gate of the app (`actor.requireClearance()`).
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
  withSpan(context, "issueRuntimeConnectionToken", async () => {
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
    });

    return {
      token,
      expiresAt,
      relayUrl: context.relay?.webSocketUrl.href ?? null,
    };
  });
