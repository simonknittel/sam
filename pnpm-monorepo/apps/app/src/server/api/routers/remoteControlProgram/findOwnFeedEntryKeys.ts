import { getApplicationContext, toActor } from "@/modules/application";
import {
  findOwnFeedEntryKeysInputSchema,
  findOwnFeedEntryKeys as findOwnFeedEntryKeysUseCase,
  type OwnFeedEntryKeys,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The keys of the own log entries that the relay has, for the browser
 * runtime (see `findOwnFeedEntryKeys()` of the application package): after
 * a change of the active tab, it does not send these entries again, and a
 * request for older entries counts only the other entries. A procedure and
 * not a server action: the id of a server action changes with each deploy.
 * FORBIDDEN also for an admin who assumes a user.
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
