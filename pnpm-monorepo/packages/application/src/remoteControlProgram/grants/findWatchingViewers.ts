import type { CapabilityId, VisibleTimeRange } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import { loadReadAccessToOwner } from "../access/loadReadAccess.js";

export interface FindWatchingViewersInput {
  readonly ownerCitizenId: string;
  readonly capabilityId: CapabilityId;
}

export interface WatchingViewer {
  readonly viewerCitizenId: string;
  /**
   * Send the viewer only the entries whose time is in this range
   * (`isInVisibleTimeRange()` of the domain)
   */
  readonly visibleTimeRange: VisibleTimeRange;
}

/**
 * The viewers that get the new entries of one capability of one owner: at
 * least one valid watch lease of a consumer of the viewer for the capability
 * that watches all owners or this owner, and the effective access now (`loadReadAccessToOwner()`: the
 * switches, both permissions, the clearance, and the owner or a valid
 * grant). The owner is a viewer too, when the owner watches: the own entries
 * from a different runtime come through the relay.
 *
 * The relay service calls it for each accepted batch of an owner, without a
 * session. It keeps no cache (principle 5): one query for the leases, then
 * the queries of the access in parallel. Each viewer is in the result once.
 */
export const findWatchingViewers = (
  context: ApplicationContext,
  { ownerCitizenId, capabilityId }: FindWatchingViewersInput,
): Promise<WatchingViewer[]> =>
  withSpan(context, "findWatchingViewers", async () => {
    const leases = await context.prisma.remoteControlProgramWatchLease.findMany(
      {
        where: {
          capabilityId,
          expiresAt: { gt: context.now() },
          OR: [
            { ownerIds: { isEmpty: true } },
            { ownerIds: { has: ownerCitizenId } },
          ],
        },
        select: { viewerId: true },
      },
    );

    const accessByViewerCitizenId = await loadReadAccessToOwner(context, {
      ownerCitizenId,
      capabilityId,
      viewerCitizenIds: [...new Set(leases.map((lease) => lease.viewerId))],
    });

    return Array.from(accessByViewerCitizenId).flatMap(
      ([viewerCitizenId, access]) =>
        access.isGranted
          ? [{ viewerCitizenId, visibleTimeRange: access.visibleTimeRange }]
          : [],
    );
  });
