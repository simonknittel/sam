import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { notifyRelayOfOwnerStop, type OwnRuntimeStop } from "./ownerStop.js";

/**
 * The "Start all" of the sharing popover: it ends the "Stop all" of the
 * actor. The runtimes upload again only the entries that they read live
 * after the start (decision 27).
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, or
 * for an admin who assumes the user
 */
export const startOwnRuntimes = (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnRuntimeStop> =>
  withSpan(context, "startOwnRuntimes", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    await context.prisma.remoteControlProgramOwnerStop.deleteMany({
      where: { ownerId: citizen.id },
    });

    await notifyRelayOfOwnerStop(context, citizen.id);

    return { stoppedAt: null };
  });
