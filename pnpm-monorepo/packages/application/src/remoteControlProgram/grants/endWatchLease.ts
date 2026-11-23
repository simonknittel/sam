import { CapabilityId, runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";

export const endWatchLeaseInputSchema = z.object({
  /** The `consumer_id` of `renewWatchLease()` */
  consumer_id: runtimeIdSchema,
  capability_id: z.enum(CapabilityId),
});

export type EndWatchLeaseInput = z.output<typeof endWatchLeaseInputSchema>;

export interface EndWatchLeaseOutput {
  /** False when the consumer had no lease for the capability */
  readonly isEnded: boolean;
}

/**
 * Ends the watch lease of one consumer of the actor (the viewer) for one
 * capability, for example when the Log Analyzer closes. The leases of the
 * other consumers of the viewer stay. It needs no permission, because a
 * consumer can close after the user lost the permission.
 *
 * @throws ForbiddenError when the actor has no citizen
 */
export const endWatchLease = async (
  context: ApplicationContext,
  actor: Actor,
  input: EndWatchLeaseInput,
): Promise<EndWatchLeaseOutput> => {
  const citizen = requireCitizen(actor);

  const { count } =
    await context.prisma.remoteControlProgramWatchLease.deleteMany({
      where: {
        viewerId: citizen.id,
        capabilityId: input.capability_id,
        consumerId: input.consumer_id,
      },
    });

  return { isEnded: count > 0 };
};
