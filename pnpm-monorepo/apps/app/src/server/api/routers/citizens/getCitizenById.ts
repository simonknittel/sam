import { getCitizenProfile } from "@/modules/citizen/queries/getCitizenProfile";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

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
      throw toTrpcError(error, "Failed to fetch citizen by ID");
    }
  });
