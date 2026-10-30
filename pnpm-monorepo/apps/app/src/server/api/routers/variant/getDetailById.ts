import { getApplicationContext, toActor } from "@/modules/application";
import { findVariantDetail, idSchema } from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/** For the variant popover, see `findVariantDetail()` */
export const getDetailById = protectedProcedure
  .input(z.object({ id: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      const variant = await findVariantDetail(
        getApplicationContext(),
        await toActor(ctx.session),
        { variantId: input.id },
      );

      if (!variant)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });

      return variant;
    } catch (error) {
      throw toTrpcError(error, "Failed to load the variant");
    }
  });
