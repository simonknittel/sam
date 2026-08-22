import { getAddableParticipantIds as query } from "@/modules/events/queries/getAddableParticipantIds";
import { getEventById } from "@/modules/events/queries/getEventById";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { EventSource } from "@sam-monorepo/database/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The citizens the viewer may add as participants to the event. Loaded
 * lazily by the add modal, which only queries while it is open.
 */
export const getAddableParticipantIds = protectedProcedure
  .input(z.object({ eventId: z.cuid() }))
  .query(async ({ input }) => {
    try {
      const event = await getEventById(input.eventId);
      if (event?.source !== EventSource.APP)
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      if (!(await isAllowedToManageEvent(event)))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing event manage permission",
        });

      return await query(event);
    } catch (error) {
      throw toTrpcError(error, "Failed to resolve addable event participants");
    }
  });
