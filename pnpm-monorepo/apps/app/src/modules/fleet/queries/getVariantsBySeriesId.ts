import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Series } from "@sam-monorepo/database/client";

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
