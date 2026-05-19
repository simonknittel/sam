import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getManufacturerById = protectedProcedure
  .input(
    z.object({
      id: z.cuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.manufacturer.findUnique({
      where: {
        id: input.id,
      },
    });
  });
