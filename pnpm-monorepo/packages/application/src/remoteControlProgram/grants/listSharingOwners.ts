import {
  ACTIVE_CITIZEN_WHERE,
  CapabilityId,
  type VisibleTimeRange,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { CitizenReference } from "../../citizenReference.js";
import type { ApplicationContext } from "../../context.js";
import { MAXIMUM_PAGE_LIMIT } from "../../pagination.js";
import { withSpan } from "../../withSpan.js";
import { loadReadAccessOfViewer } from "../access/loadReadAccess.js";
import { requireGrantedReadAccess } from "../access/requireGrantedReadAccess.js";

/**
 * The owners with a grant to "everyone" share with each viewer, thus the list
 * grows with the owners who use the Remote Control Program
 */
const MAXIMUM_LISTED_SHARING_OWNERS = MAXIMUM_PAGE_LIMIT;

export const listSharingOwnersInputSchema = z.object({
  capability_id: z.enum(CapabilityId),
});

export type ListSharingOwnersInput = z.output<
  typeof listSharingOwnersInputSchema
>;

export interface SharingOwner {
  readonly citizen: CitizenReference;
  /** The viewer reads only the entries of this range (decision 8) */
  readonly visibleTimeRange: VisibleTimeRange;
}

export interface SharingOwners {
  /** Sorted by the handle */
  readonly owners: SharingOwner[];
  /** True when more owners share than the list contains */
  readonly hasMoreOwners: boolean;
}

/**
 * The other owners whose entries of the capability the actor (the viewer)
 * can read now, through a valid grant: for example the citizens whose log
 * entries the Log Analyzer can show. The viewer is not in the list.
 *
 * @throws ForbiddenError when the actor has no citizen or is an admin who
 * assumes the user, or when the viewer cannot read the capability at all: a
 * switch is off, or `remoteControlProgram;use` or the permission of the
 * consumer is missing (`RemoteControlProgramErrorMessage`)
 */
export const listSharingOwners = (
  context: ApplicationContext,
  actor: Actor,
  input: ListSharingOwnersInput,
): Promise<SharingOwners> =>
  withSpan(context, "listSharingOwners", async () => {
    const { viewer, accessByOwnerCitizenId } = await loadReadAccessOfViewer(
      context,
      actor,
      { capabilityId: input.capability_id },
    );

    const ownAccess = accessByOwnerCitizenId.get(viewer.citizenId);
    if (!ownAccess) throw new Error("The access to the own data is missing");
    // The own access fails only for a switch or a permission, which apply to all owners
    requireGrantedReadAccess(ownAccess);

    const visibleTimeRangeByOwnerCitizenId = new Map(
      Array.from(accessByOwnerCitizenId).flatMap(([ownerCitizenId, access]) =>
        ownerCitizenId !== viewer.citizenId && access.isGranted
          ? [[ownerCitizenId, access.visibleTimeRange] as const]
          : [],
      ),
    );
    if (visibleTimeRangeByOwnerCitizenId.size === 0)
      return { owners: [], hasMoreOwners: false };

    const citizens = await context.prisma.citizen.findMany({
      where: {
        id: { in: [...visibleTimeRangeByOwnerCitizenId.keys()] },
        ...ACTIVE_CITIZEN_WHERE,
      },
      orderBy: [{ handle: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      take: MAXIMUM_LISTED_SHARING_OWNERS + 1,
      select: { id: true, handle: true },
    });

    return {
      owners: citizens
        .slice(0, MAXIMUM_LISTED_SHARING_OWNERS)
        .flatMap(({ id, handle }) => {
          const visibleTimeRange = visibleTimeRangeByOwnerCitizenId.get(id);

          return visibleTimeRange
            ? [{ citizen: { id, handle }, visibleTimeRange }]
            : [];
        }),
      hasMoreOwners: citizens.length > MAXIMUM_LISTED_SHARING_OWNERS,
    };
  });
