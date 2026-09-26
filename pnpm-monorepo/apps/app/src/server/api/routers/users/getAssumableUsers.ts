import { log } from "@/modules/logging";
import { getAssumableUsers as getAssumableUsersQuery } from "@/modules/users/queries/getAssumableUsers";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { adminProcedure } from "../../trpc";

export const getAssumableUsers = adminProcedure.query(async ({ ctx }) => {
  try {
    return await getAssumableUsersQuery(
      ctx.session.assumedByAdminId ?? ctx.session.user.id,
    );
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
