import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { findOwnerStoppedAt, type OwnRuntimeStop } from "./ownerStop.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  type OwnRuntime,
} from "./ownRuntime.js";

/**
 * The rows stay after the connections close, and each browser profile makes
 * its own runtime. The status shows the most recent ones.
 */
const MAXIMUM_LISTED_RUNTIMES = 20;

export interface OwnRuntimes extends OwnRuntimeStop {
  /** The most recent connections first */
  readonly runtimes: OwnRuntime[];
}

/**
 * The runtimes of the actor with their presence and their announcement, and
 * the "Stop all" of the actor: the status section of the sharing popover
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, or
 * for an admin who assumes the user
 */
export const listOwnRuntimes = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnRuntimes> => {
  const citizen = requireRemoteControlProgramUse(actor);
  const now = context.now();

  const [runtimes, stoppedAt] = await Promise.all([
    context.prisma.remoteControlProgramRuntime.findMany({
      where: { ownerId: citizen.id },
      orderBy: [{ connectedAt: "desc" }, { id: "asc" }],
      take: MAXIMUM_LISTED_RUNTIMES,
      select: OWN_RUNTIME_SELECT,
    }),
    findOwnerStoppedAt(context, citizen.id),
  ]);

  return {
    runtimes: runtimes.map((runtime) => toOwnRuntime(runtime, now)),
    stoppedAt,
  };
};
