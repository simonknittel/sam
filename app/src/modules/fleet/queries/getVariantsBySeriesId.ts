import { prisma } from "@/db";
import { type Series } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getVariantsBySeriesId = withTrace(
  "getVariantsBySeriesId",
  async (seriesId: Series["id"]) => {
    return prisma.variant.findMany({
      where: {
        seriesId,
      },
      include: {
        _count: {
          select: {
            ships: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        tags: true,
        externalLinks: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  },
);
