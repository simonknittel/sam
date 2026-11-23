import { CapabilityId, runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ConflictError, ForbiddenError } from "../../errors.js";
import { idSchema } from "../../pagination.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import {
  hasConsumerPermission,
  requireRemoteControlProgramUse,
} from "../access/remoteControlProgramPermissions.js";
import { ShareGrantErrorMessage } from "./shareGrantErrors.js";
import {
  MAXIMUM_WATCH_LEASES_PER_VIEWER,
  MAXIMUM_WATCHED_OWNERS,
  WATCH_LEASE_MILLISECONDS,
  WATCH_LEASE_RENEWAL_INTERVAL_MILLISECONDS,
  type WatchLease,
} from "./watchLease.js";

export const renewWatchLeaseInputSchema = z.object({
  /**
   * A random id that the consumer makes when it opens and keeps while it is
   * open. The same format as the id of a runtime: a UUID in lowercase letters.
   */
  consumer_id: runtimeIdSchema,
  capability_id: z.enum(CapabilityId),
  owner_citizen_ids: z
    .array(idSchema)
    .max(MAXIMUM_WATCHED_OWNERS)
    .default([])
    .describe(
      "The owners that the consumer watches. Empty: all owners that the viewer can read. The list gives no access.",
    ),
});

export type RenewWatchLeaseInput = z.output<typeof renewWatchLeaseInputSchema>;

/** An empty list covers all owners */
const coversOwners = (
  previousOwnerCitizenIds: readonly string[],
  ownerCitizenIds: readonly string[],
) =>
  previousOwnerCitizenIds.length === 0 ||
  (ownerCitizenIds.length > 0 &&
    ownerCitizenIds.every((ownerCitizenId) =>
      previousOwnerCitizenIds.includes(ownerCitizenId),
    ));

/**
 * Registers or renews the watch lease of one consumer of the actor (the
 * viewer) for one capability: the relay sends new entries of the owners to
 * the private channel of the viewer until `WatchLease.expiresAt`. Each
 * consumer has its own lease, thus the end of one consumer does not stop the
 * delivery to the others. The lease gives no access: the relay checks the
 * access at each delivery (`findWatchingViewers()`). Each renewal deletes the
 * expired leases of the viewer for the capability.
 *
 * Register the lease before the first read of the snapshot, thus no entry
 * falls between the snapshot and the first delivery.
 *
 * @throws ForbiddenError without a citizen, `remoteControlProgram;use` or the
 * permission of the consumer of the capability (`RemoteControlProgramErrorMessage`)
 * @throws ConflictError for a new lease when the viewer has
 * `MAXIMUM_WATCH_LEASES_PER_VIEWER` other valid leases for the capability
 * (`ShareGrantErrorMessage.TooManyWatchLeases`)
 */
export const renewWatchLease = (
  context: ApplicationContext,
  actor: Actor,
  input: RenewWatchLeaseInput,
): Promise<WatchLease> =>
  withSpan(context, "renewWatchLease", async () => {
    const citizen = requireRemoteControlProgramUse(actor);
    if (!hasConsumerPermission(actor.permissionSets, input.capability_id))
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ConsumerPermissionMissing,
      );

    const now = context.now();
    const ownerCitizenIds = [...new Set(input.owner_citizen_ids)];
    const expiresAt = new Date(now.getTime() + WATCH_LEASE_MILLISECONDS);
    const viewerLeasesWhere = {
      viewerId: citizen.id,
      capabilityId: input.capability_id,
    };

    const previousLease = await context.prisma.$transaction(
      async (transaction) => {
        // Two parallel new leases of one viewer wait for each other, thus they cannot both pass the limit
        await transaction.$queryRaw`
          SELECT 1 FROM "Citizen" WHERE "id" = ${citizen.id} FOR NO KEY UPDATE
        `;

        await transaction.remoteControlProgramWatchLease.deleteMany({
          where: { ...viewerLeasesWhere, expiresAt: { lte: now } },
        });

        const where = {
          viewerId_capabilityId_consumerId: {
            ...viewerLeasesWhere,
            consumerId: input.consumer_id,
          },
        };
        const lease =
          await transaction.remoteControlProgramWatchLease.findUnique({
            where,
            select: { ownerIds: true },
          });

        if (!lease) {
          const otherLeaseCount =
            await transaction.remoteControlProgramWatchLease.count({
              where: viewerLeasesWhere,
            });
          if (otherLeaseCount >= MAXIMUM_WATCH_LEASES_PER_VIEWER)
            throw new ConflictError(ShareGrantErrorMessage.TooManyWatchLeases);
        }

        await transaction.remoteControlProgramWatchLease.upsert({
          where,
          create: {
            ...viewerLeasesWhere,
            consumerId: input.consumer_id,
            ownerIds: ownerCitizenIds,
            expiresAt,
          },
          update: { ownerIds: ownerCitizenIds, expiresAt },
          select: { id: true },
        });

        return lease;
      },
    );

    return {
      consumerId: input.consumer_id,
      capabilityId: input.capability_id,
      ownerCitizenIds,
      expiresAt,
      renewalIntervalMilliseconds: WATCH_LEASE_RENEWAL_INTERVAL_MILLISECONDS,
      // The deletion of the expired leases leaves only a lease that was valid until now
      isContinuous:
        previousLease !== null &&
        coversOwners(previousLease.ownerIds, ownerCitizenIds),
    };
  });
