import "server-only";

import {
  canSeeAnyRole,
  listOwnRuntimes,
  listOwnShareGrants,
  MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
  type Actor,
  type ApplicationContext,
  type OwnRuntime,
  type OwnShareGrant,
} from "@sam-monorepo/application";

/** The data of the sections "Status" and "Shared with others" of the sharing popover */
export interface SharingPopover {
  /** The most recent connections first */
  readonly runtimes: OwnRuntime[];
  /** The start of the "Stop all" of the owner. Null: the runtimes can upload. */
  readonly stoppedAt: Date | null;
  /** The active grants, also the grants that start in the future. The newest first. */
  readonly grants: OwnShareGrant[];
  /** `createShareGrant()` refuses a new grant at this count of active grants */
  readonly maximumActiveGrantCount: number;
  /** The citizen picker of the form reads all citizens, which needs `citizen;read` */
  readonly canChooseCitizen: boolean;
  /** The form offers the grantee kind "role" only when the owner can see a role */
  readonly canChooseRole: boolean;
}

/**
 * The reads of the sharing popover for the owner (the actor)
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, or
 * for an admin who assumes the user (`RemoteControlProgramErrorMessage`)
 */
export const getSharingPopover = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<SharingPopover> => {
  const [{ runtimes, stoppedAt }, { grants }] = await Promise.all([
    listOwnRuntimes(context, actor),
    listOwnShareGrants(context, actor),
  ]);

  return {
    runtimes,
    stoppedAt,
    grants,
    maximumActiveGrantCount: MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
    canChooseCitizen: actor.authorize("citizen", "read"),
    canChooseRole: canSeeAnyRole(actor),
  };
};
