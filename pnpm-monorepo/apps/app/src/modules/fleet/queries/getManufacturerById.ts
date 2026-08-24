import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Manufacturer } from "@sam-monorepo/database/client";

export const getManufacturerById = withTrace(
  "getManufacturerById",
  async (manufacturerId: Manufacturer["id"]) => {
    return prisma.manufacturer.findUnique({
      where: {
        id: manufacturerId,
      },
      include: {
        image: { select: { id: true, mimeType: true } },
      },
    });
  },
);
