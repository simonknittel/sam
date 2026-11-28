import { RELAY_LIMITS } from "@sam-monorepo/domain";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";

/**
 * The content of a `feed_entry_keys_request`: the relay service checked it
 * with the schema of the protocol
 */
export interface FindOwnFeedEntryKeysInput {
  /** The start of the time window of the observation */
  readonly start: Date;
  /** Exclusive */
  readonly end: Date;
  /** The `nextPageCursor` of the previous page. Absent for the first page. */
  readonly pageCursor?: string;
}

export interface OwnFeedEntryKeys {
  /** The hashes of the entries (`createLogEntryHash`), in ascending order */
  readonly keys: string[];
  /** Null: the last page */
  readonly nextPageCursor: string | null;
}

/**
 * The keys of the entries of `log_entries` of the actor (the owner) whose
 * time of the observation is in the time window. A runtime leaves out the
 * entries that the relay already has from the count of a request for older
 * entries. The runtimes read the keys through the relay service
 * (`feed_entry_keys_request`, decision 34). Only the keys leave the server,
 * not the raw lines. The cursor is the last key: the unique index of the
 * owner and the hash orders the rows. A runtime with more entries in the
 * time window reads more pages, thus the answer stays complete.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, for
 * an admin who assumes the user, or when the switch turned off the Remote
 * Control Program
 */
export const findOwnFeedEntryKeys = (
  context: ApplicationContext,
  actor: Actor,
  input: FindOwnFeedEntryKeysInput,
): Promise<OwnFeedEntryKeys> =>
  withSpan(context, "findOwnFeedEntryKeys", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    if (await context.isRemoteControlProgramTurnedOff())
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ProgramTurnedOff,
      );

    const rows = await context.prisma.logAnalyzerEntry.findMany({
      where: {
        createdById: citizen.id,
        eventAt: { gte: input.start, lt: input.end },
        hash: input.pageCursor ? { gt: input.pageCursor } : undefined,
      },
      orderBy: { hash: "asc" },
      take: RELAY_LIMITS.maximumFeedEntryKeysPerPage + 1,
      select: { hash: true },
    });

    const keys = rows
      .slice(0, RELAY_LIMITS.maximumFeedEntryKeysPerPage)
      .map((row) => row.hash);

    return {
      keys,
      nextPageCursor:
        rows.length > RELAY_LIMITS.maximumFeedEntryKeysPerPage
          ? (keys.at(-1) ?? null)
          : null,
    };
  });
