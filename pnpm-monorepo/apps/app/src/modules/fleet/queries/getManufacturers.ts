import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getManufacturers = withTrace("getManufacturers", async () => {
  return prisma.manufacturer.findMany({
    select: {
      id: true,
      imageId: true,
      image: true,
      name: true,
      series: {
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
});
