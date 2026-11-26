import { RELAY_LIMITS, runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { rethrowRecordNotFound } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  type OwnRuntime,
} from "./ownRuntime.js";

export const renewRuntimeLeaseInputSchema = z.object({
  runtime_id: runtimeIdSchema,
});

export type RenewRuntimeLeaseInput = z.output<
  typeof renewRuntimeLeaseInputSchema
>;

/**
 * Renews the lease of the presence of a runtime of the actor at a
 * `heartbeat`: the runtime is online for `RELAY_LIMITS.presenceLeaseMilliseconds`
 * from now.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 * @throws NotFoundError when the actor has no runtime with the id
 * (`RemoteControlProgramErrorMessage.RuntimeNotFound`)
 */
export const renewRuntimeLease = async (
  context: ApplicationContext,
  actor: Actor,
  input: RenewRuntimeLeaseInput,
): Promise<OwnRuntime> => {
  const citizen = requireRemoteControlProgramUse(actor);
  const now = context.now();

  const runtime = await rethrowRecordNotFound(
    () =>
      context.prisma.remoteControlProgramRuntime.update({
        where: {
          ownerId_runtimeId: {
            ownerId: citizen.id,
            runtimeId: input.runtime_id,
          },
        },
        data: {
          leaseExpiresAt: new Date(
            now.getTime() + RELAY_LIMITS.presenceLeaseMilliseconds,
          ),
        },
        select: OWN_RUNTIME_SELECT,
      }),
    RemoteControlProgramErrorMessage.RuntimeNotFound,
  );

  return toOwnRuntime(runtime, now);
};
