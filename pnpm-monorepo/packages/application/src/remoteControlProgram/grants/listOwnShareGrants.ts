import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  createActiveOwnShareGrantWhere,
  MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
  OWN_SHARE_GRANT_SELECT,
  toOwnShareGrant,
  type OwnShareGrant,
} from "./ownShareGrant.js";

export interface OwnShareGrants {
  /**
   * The grants that are not revoked and did not end, also the grants that
   * start in the future. The newest grants first. The list is complete,
   * because `createShareGrant()` keeps the count of the active grants at
   * `MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER` or below.
   */
  readonly grants: OwnShareGrant[];
}

/**
 * The active grants of the actor: the section "Shared with others" of the
 * sharing popover
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 */
export const listOwnShareGrants = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnShareGrants> => {
  const citizen = requireRemoteControlProgramUse(actor);

  const grants = await context.prisma.shareGrant.findMany({
    where: createActiveOwnShareGrantWhere(citizen.id, context.now()),
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
    select: OWN_SHARE_GRANT_SELECT,
  });

  return { grants: grants.map(toOwnShareGrant) };
};
