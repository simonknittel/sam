import { Prisma } from "@sam-monorepo/database/client";
import {
  lockCitizen,
  protocolVersionSchema,
  RELAY_LIMITS,
  runtimeIdSchema,
  RuntimeKind,
  runtimeVersionSchema,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  type OwnRuntime,
} from "./ownRuntime.js";
import { requireRuntimeBelowLimit } from "./runtimeLimit.js";

/** The fields of the `hello` of the connection */
export const claimRuntimePresenceInputSchema = z.object({
  runtime_id: runtimeIdSchema,
  runtime_kind: z.enum(RuntimeKind),
  runtime_version: runtimeVersionSchema,
  /** The protocol version of the envelope of the `hello` */
  protocol_version: protocolVersionSchema,
});

export type ClaimRuntimePresenceInput = z.output<
  typeof claimRuntimePresenceInputSchema
>;

/**
 * Makes a runtime of the actor present when its connection opens: it writes
 * the versions of the `hello`, removes the announcement of the previous
 * connection, and starts the lease of the presence. The relay service calls
 * it after `checkRuntimeHello()`, when it replaces the open connection of the
 * same runtime with the new connection. `connectedAt` of the result
 * identifies the lease of the connection (see `endRuntimeLease()`).
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 * @throws ConflictError when the owner has `RELAY_LIMITS.maximumRuntimesPerOwner`
 * other runtimes online (`RemoteControlProgramErrorMessage.TooManyRuntimes`).
 * Two parallel connections of one owner can both pass `checkRuntimeHello()`,
 * thus the claim checks the limit again.
 */
export const claimRuntimePresence = (
  context: ApplicationContext,
  actor: Actor,
  input: ClaimRuntimePresenceInput,
): Promise<OwnRuntime> =>
  withSpan(context, "claimRuntimePresence", async () => {
    const citizen = requireRemoteControlProgramUse(actor);
    const now = context.now();
    const fields = {
      kind: input.runtime_kind,
      runtimeVersion: input.runtime_version,
      protocolVersion: input.protocol_version,
      announcement: Prisma.DbNull,
      connectedAt: now,
      leaseExpiresAt: new Date(
        now.getTime() + RELAY_LIMITS.presenceLeaseMilliseconds,
      ),
    };

    const runtime = await context.prisma.$transaction(async (transaction) => {
      // Two parallel claims of one owner wait for each other, thus they cannot both pass the limit
      await lockCitizen(transaction, citizen.id);
      await requireRuntimeBelowLimit(transaction, {
        ownerCitizenId: citizen.id,
        runtimeId: input.runtime_id,
        now,
      });

      return transaction.remoteControlProgramRuntime.upsert({
        where: {
          ownerId_runtimeId: {
            ownerId: citizen.id,
            runtimeId: input.runtime_id,
          },
        },
        create: { ...fields, ownerId: citizen.id, runtimeId: input.runtime_id },
        update: fields,
        select: OWN_RUNTIME_SELECT,
      });
    });

    return toOwnRuntime(runtime, now);
  });
