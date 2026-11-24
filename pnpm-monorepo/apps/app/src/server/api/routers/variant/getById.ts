import { getApplicationContext, toActor } from "@/modules/application";
import { findManagedVariant, idSchema } from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getById = protectedProcedure
  .input(z.object({ id: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      return await findManagedVariant(
        getApplicationContext(),
        await toActor(ctx.session),
        { variantId: input.id },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to load the variant");
    }
  });
