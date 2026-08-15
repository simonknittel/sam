import { authorize } from "@/modules/auth/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getById = protectedProcedure
  .input(
    z.object({
      id: z.cuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    /**
     * Only the update variant modal consumes this route; without the gate
     * every authenticated user could read variant internals like the
     * linked wiki page id.
     */
    if (
      !(await authorize(
        ctx.session,
        "manufacturersSeriesAndVariants",
        "manage",
      ))
    )
      throw new TRPCError({ code: "FORBIDDEN" });

    const variant = await ctx.prisma.variant.findUnique({
      where: {
        id: input.id,
      },
      include: {
        externalLinks: true,
      },
    });

    return variant;
  });
