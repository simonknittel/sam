import { getAllEvents as query } from "@/modules/events/queries/getAllEvents";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

export const getAllEvents = protectedProcedure.query(async () => {
  try {
    return await query();
  } catch (error) {
    log.error("Failed to fetch all events", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch all events",
    });
  }
});
