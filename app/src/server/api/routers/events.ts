import { getEvents } from "@/modules/events/queries";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const eventsRouter = createTRPCRouter({
  getAllEvents: protectedProcedure.query(async () => {
    try {
      const { events } = await getEvents("all");
      return events;
    } catch (error) {
      log.error("Failed to fetch all events", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch all events",
      });
    }
  }),
});
