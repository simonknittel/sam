import { getApplicationContext, toActor } from "@/modules/application";
import { findRolesForSalaries } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Each role with the number of citizens who get its salary, for the
 * "citizens × SILC" preview of the salary editor (see
 * `findRolesForSalaries`)
 */
export const getRolesForSalaries = protectedProcedure.query(async ({ ctx }) => {
  try {
    return await findRolesForSalaries(
      getApplicationContext(),
      await toActor(ctx.session),
    );
  } catch (error) {
    throw toTrpcError(error, "Failed to fetch roles");
  }
});
