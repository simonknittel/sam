import { getCitizenProfile } from "@/modules/citizen/queries/getCitizenProfile";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getCitizenById = protectedProcedure
  .input(z.object({ id: z.cuid() }))
  .query(async ({ input }) => {
    try {
      const profile = await getCitizenProfile(input.id);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Citizen not found",
        });
      }

      return profile;
    } catch (error) {
      log.error("Failed to fetch citizen by ID", {
        error: serializeError(error),
        citizenId: input.id,
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch citizen by ID",
      });
    }
  });
