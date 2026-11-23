import {
  CapabilityId,
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/domain";
import type { Actor, ActorCitizen } from "../../actor.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "./remoteControlProgramErrors.js";

/**
 * The permissions of the Remote Control Program (decision 24). Admin mode
 * does not apply to them: the relay service has no session and thus no
 * admin mode. Thus the app and the relay service give the same answer, for
 * example for the snapshot of a feed and for its realtime delivery.
 */

export const REMOTE_CONTROL_PROGRAM_USE_PERMISSION_SET = {
  resource: "remoteControlProgram",
  operation: "use",
} as const satisfies PermissionSet;

/**
 * The permission of the consumer of each capability. In step 2, each
 * capability has one consumer: the Log Analyzer reads `log_entries`.
 */
const CONSUMER_PERMISSION_SETS: Readonly<
  Record<CapabilityId, PermissionSet | null>
> = {
  [CapabilityId.LogEntries]: { resource: "logAnalyzer", operation: "read" },
};

/** Whether the effective permissions contain `remoteControlProgram;use` */
export const hasRemoteControlProgramUse = (
  permissionSets: PermissionSet[],
): boolean =>
  comparePermissionSets(
    REMOTE_CONTROL_PROGRAM_USE_PERMISSION_SET,
    permissionSets,
  );

/** Whether the effective permissions contain the permission of the consumer */
export const hasConsumerPermission = (
  permissionSets: PermissionSet[],
  capabilityId: CapabilityId,
): boolean => {
  // Null for a capability whose consumer has no permission of its own
  const consumerPermissionSet = CONSUMER_PERMISSION_SETS[capabilityId];

  return (
    consumerPermissionSet === null ||
    comparePermissionSets(consumerPermissionSet, permissionSets)
  );
};

/**
 * Whether the actor can use the Remote Control Program: a citizen and
 * `remoteControlProgram;use`, without admin mode, and not an admin who
 * assumes the user. The gates of the app (the browser runtime, the sharing
 * popover) use it.
 */
export const canUseRemoteControlProgram = (actor: Actor): boolean =>
  actor.assumedByAdminId === null &&
  actor.citizen !== null &&
  hasRemoteControlProgramUse(actor.permissionSets);

/**
 * Gives the citizen of the actor, for the use cases that the owner can use
 * also without the permission, for example the revocation of an own grant.
 * An admin who assumes the user gets no access: the runtime of the admin
 * would upload the log of the admin as the data of the user, and the
 * grants and the reads of the user are personal (decision 4).
 *
 * @throws ForbiddenError for an admin who assumes the user
 * (`RemoteControlProgramErrorMessage.AssumedUser`) or without a citizen
 * (`RemoteControlProgramErrorMessage.CitizenMissing`)
 */
export const requireRemoteControlProgramCitizen = (
  actor: Actor,
): ActorCitizen => {
  if (actor.assumedByAdminId !== null)
    throw new ForbiddenError(RemoteControlProgramErrorMessage.AssumedUser);

  if (!actor.citizen)
    throw new ForbiddenError(RemoteControlProgramErrorMessage.CitizenMissing);

  return actor.citizen;
};

/**
 * Gives the citizen of the actor
 *
 * @throws ForbiddenError for the errors of
 * `requireRemoteControlProgramCitizen()`, or without
 * `remoteControlProgram;use` (`RemoteControlProgramErrorMessage.PermissionMissing`)
 */
export const requireRemoteControlProgramUse = (actor: Actor): ActorCitizen => {
  const citizen = requireRemoteControlProgramCitizen(actor);

  if (!hasRemoteControlProgramUse(actor.permissionSets))
    throw new ForbiddenError(
      RemoteControlProgramErrorMessage.PermissionMissing,
    );

  return citizen;
};
