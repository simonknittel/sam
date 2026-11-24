import { getApplicationContext, toActor } from "@/modules/application";
import {
  ForbiddenError,
  searchCitizensAndOrganizations,
  searchCitizensAndOrganizationsInputSchema,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const search = protectedProcedure
  .input(searchCitizensAndOrganizationsInputSchema)
  .query(async ({ ctx, input }) => {
    try {
      const { hits } = await searchCitizensAndOrganizations(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );

      return hits;
    } catch (error) {
      if (error instanceof ForbiddenError) return [];

      throw toTrpcError(error, "Failed to search Spynet");
    }
  });
