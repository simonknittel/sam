import { requireAuthentication } from "@/modules/auth/server";
import { getAddableParticipantIds as query } from "@/modules/events/queries/getAddableParticipantIds";
import { getParticipatableAppEvent } from "@/modules/events/utils/getParticipatableAppEvent";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The citizens the viewer may add as participants to the event. Loaded
 * lazily by the add modal, which only queries while it is open. Gated like
 * `addEventParticipants` itself, so the modal cannot enumerate a set the
 * action would refuse to act on.
 */
export const getAddableParticipantIds = protectedProcedure
  .input(z.object({ eventId: z.cuid() }))
  .query(async ({ input }) => {
    try {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("event", "read")))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing event read permission",
        });

      const event = await getParticipatableAppEvent(input.eventId);
      if (!event || !isEventUpdatable(event))
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
