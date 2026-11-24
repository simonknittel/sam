import { getApplicationContext, toActor } from "@/modules/application";
import { findUsableEventTemplates } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getUsableEventTemplates = protectedProcedure.query(
  async ({ ctx }) => {
    try {
      return await findUsableEventTemplates(
        getApplicationContext(),
        await toActor(ctx.session),
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch usable event templates");
    }
  },
);
