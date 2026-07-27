import { prisma } from "@/db";
import { type Manufacturer } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getManufacturerById = withTrace(
  "getManufacturerById",
  async (manufacturerId: Manufacturer["id"]) => {
    return prisma.manufacturer.findUnique({
      where: {
        id: manufacturerId,
      },
      include: {
        image: true,
      },
    });
  },
);
