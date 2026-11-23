import { getApplicationContext, toActor } from "@/modules/application";
import {
  endWatchLeaseInputSchema,
  endWatchLease as endWatchLeaseUseCase,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Ends the watch lease of one consumer when it closes (see `endWatchLease()`
 * of the application package)
 */
export const endWatchLease = protectedProcedure
  .input(endWatchLeaseInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await endWatchLeaseUseCase(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to end a watch lease");
    }
  });
