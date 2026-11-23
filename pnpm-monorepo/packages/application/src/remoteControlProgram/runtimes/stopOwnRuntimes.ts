import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import { notifyRelayOfOwnerStop, type OwnRuntimeStop } from "./ownerStop.js";

/**
 * The "Stop all" of the sharing popover for all runtimes of the actor. The
 * relay service refuses the uploads of the runtimes of the actor until
 * `startOwnRuntimes()`, and tells the runtimes. The entries of the time of
 * the stop stay on the machine (decision 27). A second stop keeps the start
 * time of the first stop.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 */
export const stopOwnRuntimes = (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnRuntimeStop> =>
  withSpan(context, "stopOwnRuntimes", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    const { stoppedAt } =
      await context.prisma.remoteControlProgramOwnerStop.upsert({
        where: { ownerId: citizen.id },
        create: { ownerId: citizen.id, stoppedAt: context.now() },
        update: {},
        select: { stoppedAt: true },
      });

    await notifyRelayOfOwnerStop(context, citizen.id);

    return { stoppedAt };
  });
