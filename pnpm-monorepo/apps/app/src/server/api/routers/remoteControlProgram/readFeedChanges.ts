import { getApplicationContext, toActor } from "@/modules/application";
import {
  FeedEntryReadMode,
  readFeedEntries,
  readFeedEntriesInputSchema,
} from "@sam-monorepo/application";
import type * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

const [, changesInputSchema] = readFeedEntriesInputSchema.options;

/** A different order of the options of the use case fails here */
const CHANGES_MODE: z.output<typeof changesInputSchema>["mode"] =
  FeedEntryReadMode.Changes;

/**
 * The entries of `log_entries` that arrived after the cursor, oldest first,
 * for the consumer client (see `readFeedEntries()`): after a reconnect of the
 * realtime service, after a gap of the watch lease, and after entries that
 * the relay service dropped.
 */
export const readFeedChanges = protectedProcedure
  .input(changesInputSchema.omit({ mode: true }))
  .query(async ({ ctx, input }) => {
    try {
      return await readFeedEntries(
        getApplicationContext(),
        await toActor(ctx.session),
        { ...input, mode: CHANGES_MODE },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to read the changes of a feed");
    }
  });
