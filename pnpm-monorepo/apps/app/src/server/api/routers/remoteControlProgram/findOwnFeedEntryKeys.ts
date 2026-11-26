import { getApplicationContext, toActor } from "@/modules/application";
import {
  findOwnFeedEntryKeysInputSchema,
  findOwnFeedEntryKeys as findOwnFeedEntryKeysUseCase,
  type OwnFeedEntryKeys,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The keys of the own log entries that the relay has (see
 * `findOwnFeedEntryKeys()` of the application package), only for the browser
 * runtimes of protocol version 1 in the SAM tabs that were open during the
 * release of version 2. The browser runtime of version 2 gets the keys
 * through its connection to the relay (decision 34).
 *
 * @deprecated Remove it when `MINIMUM_RELAY_PROTOCOL_VERSION` becomes 2.
 * Until then, a procedure and not a server action: the id of a server action
 * changes with each deploy. FORBIDDEN also for an admin who assumes a user.
 */
export const findOwnFeedEntryKeys = protectedProcedure
  .input(findOwnFeedEntryKeysInputSchema)
  .query(async ({ ctx, input }): Promise<OwnFeedEntryKeys> => {
    try {
      return await findOwnFeedEntryKeysUseCase(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to find the keys of the own entries");
    }
  });
