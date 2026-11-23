import { getApplicationContext, toActor } from "@/modules/application";
import {
  FeedEntryReadMode,
  readFeedEntries,
  readFeedEntriesInputSchema,
} from "@sam-monorepo/application";
import type * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

const [snapshotInputSchema] = readFeedEntriesInputSchema.options;

/** A different order of the options of the use case fails here */
const SNAPSHOT_MODE: z.output<typeof snapshotInputSchema>["mode"] =
  FeedEntryReadMode.Snapshot;

/**
 * One page of the snapshot of `log_entries` for the consumer client: the
 * entries of the time window that the viewer can read, newest first (see
 * `readFeedEntries()`). A procedure and not a server action: the consumer
 * reads in the background, and the id of a server action changes with each
 * deploy.
 */
export const readFeedSnapshot = protectedProcedure
  .input(snapshotInputSchema.omit({ mode: true }))
  .query(async ({ ctx, input }) => {
    try {
      return await readFeedEntries(
        getApplicationContext(),
        await toActor(ctx.session),
        { ...input, mode: SNAPSHOT_MODE },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to read the snapshot of a feed");
    }
  });
