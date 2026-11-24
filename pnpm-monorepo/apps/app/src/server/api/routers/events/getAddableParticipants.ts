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
