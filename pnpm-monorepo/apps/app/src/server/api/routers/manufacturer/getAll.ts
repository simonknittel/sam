import { protectedProcedure } from "../../trpc";

export const getAllManufacturers = protectedProcedure.query(async ({ ctx }) => {
  return await ctx.prisma.manufacturer.findMany({
    orderBy: {
      name: "asc",
    },
  });
});
