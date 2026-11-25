import { runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { requireRuntimeBelowLimit } from "./runtimeLimit.js";

export const checkRuntimeHelloInputSchema = z.object({
  /** The id of the `hello` and of the connection token */
  runtime_id: runtimeIdSchema,
});

export type CheckRuntimeHelloInput = z.output<
  typeof checkRuntimeHelloInputSchema
>;

/**
 * Checks the `hello` of a connection of a runtime of the actor, after
 * `authenticateRuntimeConnection()`. It writes nothing: a connection that
 * fails later in its handshake must not change the presence of an open
 * connection of the same runtime. The relay service claims the presence with
 * `claimRuntimePresence()` when the connection opens.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, or
 * when the switch of the full Remote Control Program is off
 * (`RemoteControlProgramErrorMessage.ProgramTurnedOff`)
 * @throws ConflictError when the owner has `RELAY_LIMITS.maximumRuntimesPerOwner`
 * other runtimes online (`RemoteControlProgramErrorMessage.TooManyRuntimes`)
 */
export const checkRuntimeHello = (
  context: ApplicationContext,
  actor: Actor,
  input: CheckRuntimeHelloInput,
): Promise<void> =>
  withSpan(context, "checkRuntimeHello", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    const switches = await context.remoteControlProgramSwitches();
    if (switches.isProgramTurnedOff)
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ProgramTurnedOff,
      );

    await requireRuntimeBelowLimit(context.prisma, {
      ownerCitizenId: citizen.id,
      runtimeId: input.runtime_id,
      now: context.now(),
    });
  });
