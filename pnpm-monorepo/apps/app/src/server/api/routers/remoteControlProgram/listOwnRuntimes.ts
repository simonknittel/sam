import { getApplicationContext, toActor } from "@/modules/application";
import { listOwnRuntimes as listOwnRuntimesUseCase } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The connected runtimes of the user with their announcements (see
 * `listOwnRuntimes()` of the application package). A control UI reads them
 * again at an interval, for example the Log Analyzer, which tells when a
 * desktop companion uploads the own entries.
 */
export const listOwnRuntimes = protectedProcedure.query(async ({ ctx }) => {
  try {
    return await listOwnRuntimesUseCase(
      getApplicationContext(),
      await toActor(ctx.session),
    );
  } catch (error) {
    throw toTrpcError(error, "Failed to list the own runtimes");
  }
});
