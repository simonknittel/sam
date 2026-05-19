import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getSeriesByManufacturerId = protectedProcedure
  .input(
    z.object({
      manufacturerId: z.cuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const series = await ctx.prisma.series.findMany({
      where: {
        manufacturerId: input.manufacturerId,
      },
      orderBy: {
        name: "asc",
      },
    });
    return series;
  });
