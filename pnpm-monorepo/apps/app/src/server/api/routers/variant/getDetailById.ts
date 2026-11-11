import { getApplicationContext, toActor } from "@/modules/application";
import { findVariantPopoverDetail, idSchema } from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/** For the variant popover, see `findVariantPopoverDetail()` */
export const getDetailById = protectedProcedure
  .input(z.object({ id: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      const variant = await findVariantPopoverDetail(
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
