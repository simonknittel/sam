import { Prisma } from "@sam-monorepo/database/client";
import {
  RELAY_LIMITS,
  RuntimeKind,
  runtimeIdSchema,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ConflictError, ForbiddenError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  toRuntimeKindOfDatabase,
  type OwnRuntime,
} from "./ownRuntime.js";

/** The limit of `runtime_version` in the `hello` of the protocol */
const MAXIMUM_RUNTIME_VERSION_LENGTH = 64;

/** The fields of the `hello` of a connection */
export const announceRuntimeInputSchema = z.object({
  runtime_id: runtimeIdSchema,
  runtime_kind: z.enum(RuntimeKind),
  runtime_version: z.string().min(1).max(MAXIMUM_RUNTIME_VERSION_LENGTH),
  /** The protocol version of the envelope of the `hello` */
  protocol_version: z.int32().min(1),
});

export type AnnounceRuntimeInput = z.output<typeof announceRuntimeInputSchema>;

export interface AnnounceRuntimeOutput {
  readonly runtime: OwnRuntime;
  /** The "Stop all" of the owner is active: `is_stopped` of the `welcome` */
  readonly isOwnerStopped: boolean;
}

/**
 * Makes a runtime of the actor present at the `hello` of a connection: it
 * writes the versions, removes the announcement of the previous connection,
 * and starts the lease of the presence. The relay service calls it after
 * `authenticateRuntimeConnection()`.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, or
 * when the switch of the full Remote Control Program is off
 * (`RemoteControlProgramErrorMessage.ProgramTurnedOff`)
 * @throws ConflictError when the owner has `RELAY_LIMITS.maximumRuntimesPerOwner`
 * other runtimes online (`RemoteControlProgramErrorMessage.TooManyRuntimes`)
 */
export const announceRuntime = (
  context: ApplicationContext,
  actor: Actor,
  input: AnnounceRuntimeInput,
): Promise<AnnounceRuntimeOutput> =>
  withSpan(context, "announceRuntime", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    const switches = await context.remoteControlProgramSwitches();
    if (switches.isProgramTurnedOff)
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ProgramTurnedOff,
      );

    const now = context.now();
    const fields = {
      kind: toRuntimeKindOfDatabase(input.runtime_kind),
      runtimeVersion: input.runtime_version,
      protocolVersion: input.protocol_version,
      announcement: Prisma.DbNull,
      connectedAt: now,
      leaseExpiresAt: new Date(
        now.getTime() + RELAY_LIMITS.presenceLeaseMilliseconds,
      ),
    };

    const { runtime, ownerStop } = await context.prisma.$transaction(
      async (transaction) => {
        // Two parallel `hello`s of one owner wait for each other, thus they cannot both pass the limit
        await transaction.$queryRaw`
          SELECT 1 FROM "Citizen" WHERE "id" = ${citizen.id} FOR NO KEY UPDATE
        `;

        const otherOnlineRuntimeCount =
          await transaction.remoteControlProgramRuntime.count({
            where: {
              ownerId: citizen.id,
              runtimeId: { not: input.runtime_id },
              leaseExpiresAt: { gt: now },
            },
          });
        if (otherOnlineRuntimeCount >= RELAY_LIMITS.maximumRuntimesPerOwner)
          throw new ConflictError(
            RemoteControlProgramErrorMessage.TooManyRuntimes,
          );

        return {
          runtime: await transaction.remoteControlProgramRuntime.upsert({
            where: {
              ownerId_runtimeId: {
                ownerId: citizen.id,
                runtimeId: input.runtime_id,
              },
            },
            create: {
              ...fields,
              ownerId: citizen.id,
              runtimeId: input.runtime_id,
            },
            update: fields,
            select: OWN_RUNTIME_SELECT,
          }),
          ownerStop: await transaction.remoteControlProgramOwnerStop.findUnique(
            {
              where: { ownerId: citizen.id },
              select: { stoppedAt: true },
            },
          ),
        };
      },
    );

    return {
      runtime: toOwnRuntime(runtime, now),
      isOwnerStopped: ownerStop !== null,
    };
  });
