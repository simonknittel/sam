import { getApplicationContext, toActor } from "@/modules/application";
import {
  ConflictError,
  renewWatchLeaseInputSchema,
  renewWatchLease as renewWatchLeaseUseCase,
  type WatchLease,
} from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, toTrpcError } from "../../trpc";

interface RenewWatchLeaseResult {
  /**
   * Null when the app has no relay service (no `RELAY_URL`): no entry
   * arrives through the relay, thus the procedure registers no lease, and
   * the consumer shows only the own entries of the browser runtime
   */
  readonly lease: WatchLease | null;
}

/**
 * Registers or renews the watch lease of one consumer (see
 * `renewWatchLease()` of the application package). A mutation and not a
 * server action: the consumer renews it in the background, and the id of a
 * server action changes with each deploy. CONFLICT when the viewer has the
 * maximum number of leases for the capability.
 */
export const renewWatchLease = protectedProcedure
  .input(renewWatchLeaseInputSchema)
  .mutation(async ({ ctx, input }): Promise<RenewWatchLeaseResult> => {
    try {
      const context = getApplicationContext();
      if (context.relay === null) return { lease: null };

      return {
        lease: await renewWatchLeaseUseCase(
          context,
          await toActor(ctx.session),
          input,
        ),
      };
    } catch (error) {
      if (error instanceof ConflictError)
        throw new TRPCError({ code: "CONFLICT", message: error.message });

      throw toTrpcError(error, "Failed to renew a watch lease");
    }
  });
