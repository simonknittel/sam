import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  type OwnRuntime,
} from "./ownRuntime.js";

export interface OwnRuntimes {
  /** The most recent connections first */
  readonly runtimes: OwnRuntime[];
}

/**
 * The connected runtimes of the actor with their announcement: the sub-tab
 * of the desktop companion in the sharing popover, and the notes of the
 * control UIs. `RELAY_LIMITS.maximumRuntimesPerOwner` limits the list.
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

  const runtimes = await context.prisma.remoteControlProgramRuntime.findMany({
    where: { ownerId: citizen.id, leaseExpiresAt: { gt: now } },
    orderBy: [{ connectedAt: "desc" }, { id: "asc" }],
    select: OWN_RUNTIME_SELECT,
  });

  return { runtimes: runtimes.map((runtime) => toOwnRuntime(runtime, now)) };
};
