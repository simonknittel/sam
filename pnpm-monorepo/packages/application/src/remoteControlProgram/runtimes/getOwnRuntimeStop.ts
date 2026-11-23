import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { findOwnerStoppedAt, type OwnRuntimeStop } from "./ownerStop.js";

/**
 * The "Stop all" of the actor. The relay service reads it for the owner of a
 * connection after `notifyOwnerStopChanged`, and sends `stop` or `start`.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 */
export const getOwnRuntimeStop = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnRuntimeStop> => {
  const citizen = requireRemoteControlProgramUse(actor);

  return { stoppedAt: await findOwnerStoppedAt(context, citizen.id) };
};
