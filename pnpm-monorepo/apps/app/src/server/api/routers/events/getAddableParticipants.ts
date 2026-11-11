import { getApplicationContext, toActor } from "@/modules/application";
import {
  ConflictError,
  findAddableEventParticipants,
  idSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The citizens the viewer may add as participants to the event, and which of
 * them have an open invitation. Loaded lazily by the add modal, which only
 * queries while it is open. Gated like `addEventParticipants` itself, so the
 * modal cannot enumerate a set the action would refuse to act on.
 */
export const getAddableParticipants = protectedProcedure
  .input(z.object({ eventId: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      return await findAddableEventParticipants(
        getApplicationContext(),
        await toActor(ctx.session),
        { eventId: input.eventId },
      );
    } catch (error) {
      // An event that ended counts as gone for the picker
      if (error instanceof NotFoundError || error instanceof ConflictError)
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      throw toTrpcError(error, "Failed to resolve addable event participants");
    }
  });
