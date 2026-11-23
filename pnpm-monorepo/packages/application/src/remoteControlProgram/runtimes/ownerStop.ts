import type { ApplicationContext } from "../../context.js";

/** The "Stop all" of the owner for all runtimes */
export interface OwnRuntimeStop {
  /** The start of the stop. Null: the runtimes of the owner can upload. */
  readonly stoppedAt: Date | null;
}

/**
 * The start of the "Stop all" of the owner, or null. No permission check:
 * the use cases of the runtimes and the upload of the feeds read it for the
 * owner of the connection.
 */
export const findOwnerStoppedAt = async (
  context: Pick<ApplicationContext, "prisma">,
  ownerCitizenId: string,
): Promise<Date | null> => {
  const ownerStop =
    await context.prisma.remoteControlProgramOwnerStop.findUnique({
      where: { ownerId: ownerCitizenId },
      select: { stoppedAt: true },
    });

  return ownerStop?.stoppedAt ?? null;
};

/**
 * Tells the relay service about a changed stop. A failure or a host without
 * relay service does not undo the change: the relay service checks the stop
 * at each upload, and gives it in the `welcome` of each new connection.
 */
export const notifyRelayOfOwnerStop = async (
  context: Pick<ApplicationContext, "relay" | "log">,
  ownerCitizenId: string,
) => {
  if (!context.relay) {
    context.log.warn(
      "No relay service is configured: the open runtime connections get the changed stop only at their next upload",
      { ownerCitizenId },
    );
    return;
  }

  try {
    await context.relay.notifyOwnerStopChanged(ownerCitizenId);
  } catch (error) {
    context.log.warn(
      "Failed to tell the relay service about the changed stop of an owner",
      { ownerCitizenId, error },
    );
  }
};
