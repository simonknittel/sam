import { getCitizens } from "@/modules/citizen/queries/getCitizens";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc";

export const getAllCitizens = protectedProcedure.query(async () => {
  try {
    return await getCitizens();
  } catch (error) {
    log.error("Failed to fetch citizens", {
      error,
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch citizens",
    });
  }
});
