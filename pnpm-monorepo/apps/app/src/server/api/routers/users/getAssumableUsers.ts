import { log } from "@/modules/logging";
import { getAssumableUsers as getAssumableUsersQuery } from "@/modules/users/queries/getAssumableUsers";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

export const getAssumableUsers = protectedProcedure.query(async ({ ctx }) => {
  /**
   * While assuming, the session carries the assumed user's role. The
   * `assumedByAdmin` flag still proves the request comes from an admin, so
   * they can switch to another user without exiting first.
   */
  if (ctx.session.user.role !== "admin" && !ctx.session.assumedByAdmin)
    throw new TRPCError({ code: "FORBIDDEN" });

  try {
    return await getAssumableUsersQuery();
  } catch (error) {
    log.error("Failed to fetch assumable users", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch assumable users",
    });
  }
});
