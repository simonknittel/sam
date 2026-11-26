import {
  LOG_ANALYZER_ENTRY_HASH_PATTERN,
  RELAY_LIMITS,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";

export const findOwnFeedEntryKeysInputSchema = z.object({
  /** The start of the time window of the observation. Without it: no limit. */
  start: z.date().optional(),
  /** Exclusive. Without it: no limit. */
  end: z.date().optional(),
  /** The `nextPageCursor` of the previous page. Absent for the first page. */
  page_cursor: z.string().regex(LOG_ANALYZER_ENTRY_HASH_PATTERN).optional(),
});

export type FindOwnFeedEntryKeysInput = z.output<
  typeof findOwnFeedEntryKeysInputSchema
>;

export interface OwnFeedEntryKeys {
  /** The hashes of the entries (`createLogEntryHash`), in ascending order */
  readonly keys: string[];
  /** Null: the last page */
  readonly nextPageCursor: string | null;
}

/**
 * The keys of the entries of `log_entries` of the actor (the owner) whose
 * time of the observation is in the time window. A runtime leaves out the
 * entries that the relay already has: after a start or a change of the
 * active tab (the runtime offers the entries of up to 7 days again), and for
 * the counts of a request for older entries. The browser runtime reads the
 * keys from the app, the desktop companion through the relay service
 * (`feed_entry_keys_request`, decision 34). Only the keys leave the server,
 * not the raw lines. The cursor is the last key: the unique index of the
 * owner and the hash orders the rows. A runtime with more entries in the
 * time window reads more pages, thus the answer stays complete.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen, for
 * an admin who assumes the user, or when a switch turned off the Remote
 * Control Program or the capability
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
        hash: input.page_cursor ? { gt: input.page_cursor } : undefined,
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
