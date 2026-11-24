import { getApplicationContext, toActor } from "@/modules/application";
import {
  findOwnEventInvitationState,
  idSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getOwnInvitationState = protectedProcedure
  .input(z.object({ invitationId: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      return await findOwnEventInvitationState(
        getApplicationContext(),
        await toActor(ctx.session),
        { invitationId: input.invitationId },
      );
    } catch (error) {
      if (error instanceof NotFoundError)
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });

      throw toTrpcError(error, "Failed to fetch the invitation state");
    }
  });
