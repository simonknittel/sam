import "server-only";

import {
  canSeeAnyRole,
  listOwnDesktopCompanionSignIns,
  listOwnRuntimes,
  listOwnShareGrants,
  MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
  type Actor,
  type ApplicationContext,
  type DesktopCompanionSignIn,
  type OwnRuntime,
  type OwnShareGrant,
} from "@sam-monorepo/application";
import { RuntimeKind } from "@sam-monorepo/domain";

/** The data of the server for the sections of the sharing popover */
export interface SharingPopover {
  /**
   * The connected desktop companions of the owner, the most recent
   * connections first. The popover shows no other browser of the owner.
   */
  readonly desktopCompanions: OwnRuntime[];
  /** The active grants, also the grants that start in the future. The newest first. */
  readonly grants: OwnShareGrant[];
  /** `createShareGrant()` refuses a new grant at this count of active grants */
  readonly maximumActiveGrantCount: number;
  /** The citizen picker of the form reads all citizens, which needs `citizen;read` */
  readonly canChooseCitizen: boolean;
  /** The form offers the grantee kind "role" only when the owner can see a role */
  readonly canChooseRole: boolean;
  /** The newest first */
  readonly desktopCompanionSignIns: DesktopCompanionSignIn[];
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
  const [{ runtimes }, { grants }, { signIns }] = await Promise.all([
    listOwnRuntimes(context, actor),
    listOwnShareGrants(context, actor),
    listOwnDesktopCompanionSignIns(context, actor),
  ]);

  return {
    desktopCompanions: runtimes.filter(
      (runtime) => runtime.kind === RuntimeKind.desktop_companion,
    ),
    grants,
    desktopCompanionSignIns: signIns,
    maximumActiveGrantCount: MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
    canChooseCitizen: actor.authorize("citizen", "read"),
    canChooseRole: canSeeAnyRole(actor),
  };
};
