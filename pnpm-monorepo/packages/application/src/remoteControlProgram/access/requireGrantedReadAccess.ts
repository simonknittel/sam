import {
  ReadAccessRefusal,
  type EffectiveReadAccess,
} from "@sam-monorepo/domain";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "./remoteControlProgramErrors.js";

export type GrantedReadAccess = Extract<
  EffectiveReadAccess,
  { readonly isGranted: true }
>;

const REFUSAL_MESSAGES: Readonly<
  Record<ReadAccessRefusal, RemoteControlProgramErrorMessage>
> = {
  [ReadAccessRefusal.ProgramTurnedOff]:
    RemoteControlProgramErrorMessage.ProgramTurnedOff,
  [ReadAccessRefusal.RemoteControlProgramPermissionMissing]:
    RemoteControlProgramErrorMessage.PermissionMissing,
  [ReadAccessRefusal.ConsumerPermissionMissing]:
    RemoteControlProgramErrorMessage.ConsumerPermissionMissing,
  [ReadAccessRefusal.NoValidGrant]:
    RemoteControlProgramErrorMessage.NoValidGrant,
};

/**
 * Gives the granted access, for a read that needs it
 *
 * @throws ForbiddenError with the message of the refusal
 */
export const requireGrantedReadAccess = (
  access: EffectiveReadAccess,
): GrantedReadAccess => {
  if (!access.isGranted)
    throw new ForbiddenError(REFUSAL_MESSAGES[access.refusal]);

  return access;
};
