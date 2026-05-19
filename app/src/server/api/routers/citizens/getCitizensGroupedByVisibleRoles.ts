import { getCitizensGroupedByVisibleRoles as query } from "@/modules/citizen/queries/getCitizensGroupedByVisibleRoles";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

export const getCitizensGroupedByVisibleRoles = protectedProcedure.query(
  async () => {
    try {
      return await query();
    } catch (error) {
      log.error("Failed to fetch citizens", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch citizens",
      });
    }
  },
);
