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

/** Null for a capability whose consumer has no permission of its own */
export const getConsumerPermissionSet = (
  capabilityId: CapabilityId,
): PermissionSet | null => CONSUMER_PERMISSION_SETS[capabilityId];

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
  const consumerPermissionSet = getConsumerPermissionSet(capabilityId);

  return (
    consumerPermissionSet === null ||
    comparePermissionSets(consumerPermissionSet, permissionSets)
  );
};

/**
 * Whether the actor can use the Remote Control Program: a citizen and
 * `remoteControlProgram;use`, without admin mode. The gates of the app (the
 * browser runtime, the sharing popover) use it.
 */
export const canUseRemoteControlProgram = (actor: Actor): boolean =>
  actor.citizen !== null && hasRemoteControlProgramUse(actor.permissionSets);

/**
 * Gives the citizen of the actor
 *
 * @throws ForbiddenError without a citizen
 * (`RemoteControlProgramErrorMessage.CitizenMissing`) or without
 * `remoteControlProgram;use` (`RemoteControlProgramErrorMessage.PermissionMissing`)
 */
export const requireRemoteControlProgramUse = (actor: Actor): ActorCitizen => {
  if (!actor.citizen)
    throw new ForbiddenError(RemoteControlProgramErrorMessage.CitizenMissing);

  if (!hasRemoteControlProgramUse(actor.permissionSets))
    throw new ForbiddenError(
      RemoteControlProgramErrorMessage.PermissionMissing,
    );

  return actor.citizen;
};
