import { protectedProcedure } from "../../trpc";

/**
 * All variants with their manufacturer, for the wiki's variant link
 * picker and for resolving links inserted since the page was loaded.
 * Deliberately not gated on the fleet permissions: variant links render
 * for every authenticated user (only the variant page itself is gated).
 */
export const getAll = protectedProcedure.query(async ({ ctx }) => {
  const variants = await ctx.prisma.variant.findMany({
    select: {
      id: true,
      name: true,
      series: {
        select: {
          manufacturer: {
            select: {
              name: true,
              image: {
                select: {
                  id: true,
                  mimeType: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    manufacturerName: variant.series.manufacturer.name,
    manufacturerImage: variant.series.manufacturer.image,
  }));
});
