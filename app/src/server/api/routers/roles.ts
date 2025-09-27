import { log } from "@/modules/logging";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const rolesRouter = createTRPCRouter({
  getVisibleRoles: protectedProcedure.query(async () => {
    try {
      return await getVisibleRoles();
    } catch (error) {
      void log.error("Failed to fetch visible roles", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch visible roles",
      });
    }
  }),
});
