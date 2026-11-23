import { runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";

export const endRuntimeLeaseInputSchema = z.object({
  runtime_id: runtimeIdSchema,
  /**
   * The `connectedAt` of the connection (from `claimRuntimePresence()`). A newer
   * connection of the same runtime has a different time, thus the close of
   * the replaced connection does not end the lease of the newer connection.
   */
  connected_at: z.date(),
});

export type EndRuntimeLeaseInput = z.output<typeof endRuntimeLeaseInputSchema>;

export interface EndRuntimeLeaseOutput {
  /**
   * False when a newer connection of the runtime owns the lease, or when the
   * lease already ended
   */
  readonly isEnded: boolean;
}

/**
 * Ends the lease of the presence at the close of a connection: the runtime
 * is offline from now. It needs no permission, because a connection can
 * close after the user lost the permission, and its runtime must go offline.
 *
 * @throws ForbiddenError when the actor has no citizen
 */
export const endRuntimeLease = async (
  context: ApplicationContext,
  actor: Actor,
  input: EndRuntimeLeaseInput,
): Promise<EndRuntimeLeaseOutput> => {
  const citizen = requireCitizen(actor);
  const now = context.now();

  const { count } = await context.prisma.remoteControlProgramRuntime.updateMany(
    {
      where: {
        ownerId: citizen.id,
        runtimeId: input.runtime_id,
        connectedAt: input.connected_at,
        leaseExpiresAt: { gt: now },
      },
      data: { leaseExpiresAt: now },
    },
  );

  return { isEnded: count > 0 };
};
