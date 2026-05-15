import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const variantRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(
      z.object({
        id: z.cuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const variant = await ctx.prisma.variant.findUnique({
        where: {
          id: input.id,
        },
        include: {
          externalLinks: true,
        },
      });

      return variant;
    }),
});
