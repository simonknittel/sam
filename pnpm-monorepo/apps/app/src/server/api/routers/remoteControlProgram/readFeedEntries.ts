import { getApplicationContext, toActor } from "@/modules/application";
import {
  FeedEntryReadMode,
  readFeedEntriesInputSchema,
  readFeedEntries as readFeedEntriesUseCase,
  type ReadFeedEntriesInput,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

const [firstOption, secondOption] = readFeedEntriesInputSchema.options;

/**
 * The input of the use case without `mode`, because the browser cannot load
 * the enum of the application package: a read with `cursor` reads the
 * changes, a read without it one page of the snapshot. Both objects are
 * strict, thus the order of the options of the use case does not matter.
 */
const inputSchema = z.union([
  firstOption.omit({ mode: true }).strict(),
  secondOption.omit({ mode: true }).strict(),
]);

const toUseCaseInput = (
  input: z.output<typeof inputSchema>,
): ReadFeedEntriesInput =>
  "cursor" in input
    ? { ...input, mode: FeedEntryReadMode.Changes }
    : { ...input, mode: FeedEntryReadMode.Snapshot };

/**
 * The entries of `log_entries` for the consumer client (see
 * `readFeedEntries()` of the application package): one page of the snapshot
 * of the time window, newest first, or the entries that arrived after the
 * cursor, oldest first. A procedure and not a server action: the consumer
 * reads in the background, and the id of a server action changes with each
 * deploy.
 */
export const readFeedEntries = protectedProcedure
  .input(inputSchema)
  .query(async ({ ctx, input }) => {
    try {
      return await readFeedEntriesUseCase(
        getApplicationContext(),
        await toActor(ctx.session),
        toUseCaseInput(input),
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to read the entries of a feed");
    }
  });
