import { getApplicationContext, toActor } from "@/modules/application";
import { findRolesForSalaries } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

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
