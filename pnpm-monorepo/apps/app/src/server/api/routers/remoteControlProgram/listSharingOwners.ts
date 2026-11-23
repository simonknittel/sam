import { getApplicationContext, toActor } from "@/modules/application";
import {
  listSharingOwnersInputSchema,
  listSharingOwners as listSharingOwnersUseCase,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The other owners whose entries of the capability the viewer can read now
 * (see `listSharingOwners()` of the application package). The consumer
 * client reads it again at each renewal of its watch lease, and reads a new
 * snapshot when the list changes.
 */
export const listSharingOwners = protectedProcedure
  .input(listSharingOwnersInputSchema)
  .query(async ({ ctx, input }) => {
    try {
      return await listSharingOwnersUseCase(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to list the sharing owners");
    }
  });
