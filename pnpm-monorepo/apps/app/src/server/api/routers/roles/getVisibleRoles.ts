import { log } from "@/modules/logging";
import { getVisibleRoles as query } from "@/modules/roles/utils/getRoles";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

export const getVisibleRoles = protectedProcedure.query(async () => {
  try {
    return await query();
  } catch (error) {
    log.error("Failed to fetch visible roles", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch visible roles",
    });
  }
});
