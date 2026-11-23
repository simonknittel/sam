import type { ApplicationContext } from "../../context.js";
import { findOwnerStoppedAt, type OwnRuntimeStop } from "./ownerStop.js";

export interface RuntimeStopOfOwnerInput {
  readonly ownerCitizenId: string;
}

/**
 * The "Stop all" of an owner, for the relay service: after
 * `notifyOwnerStopChanged`, and after a change of the stop in the handshake
 * of a connection. No actor and no permission check: a stop must also reach
 * the open connections of an owner who lost `remoteControlProgram;use`.
 */
export const getRuntimeStopOfOwner = async (
  context: ApplicationContext,
  { ownerCitizenId }: RuntimeStopOfOwnerInput,
): Promise<OwnRuntimeStop> => ({
  stoppedAt: await findOwnerStoppedAt(context, ownerCitizenId),
});
