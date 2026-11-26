import type { PrismaClientType } from "@sam-monorepo/database";
import { RELAY_LIMITS } from "@sam-monorepo/domain";
import { ConflictError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";

interface RuntimeLimitInput {
  readonly ownerCitizenId: string;
  readonly runtimeId: string;
  readonly now: Date;
}

/**
 * Checks the limit of the runtimes of an owner that are online at the same
 * time. The runtime itself does not count, thus a runtime that is online can
 * always connect again.
 *
 * @throws ConflictError when the owner has
 * `RELAY_LIMITS.maximumRuntimesPerOwner` other runtimes online
 * (`RemoteControlProgramErrorMessage.TooManyRuntimes`)
 */
export const requireRuntimeBelowLimit = async (
  client: Pick<PrismaClientType, "remoteControlProgramRuntime">,
  { ownerCitizenId, runtimeId, now }: RuntimeLimitInput,
) => {
  const otherOnlineRuntimeCount =
    await client.remoteControlProgramRuntime.count({
      where: {
        ownerId: ownerCitizenId,
        runtimeId: { not: runtimeId },
        leaseExpiresAt: { gt: now },
      },
    });

  if (otherOnlineRuntimeCount >= RELAY_LIMITS.maximumRuntimesPerOwner)
    throw new ConflictError(RemoteControlProgramErrorMessage.TooManyRuntimes);
};
