import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Series } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";

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
                owner: ACTIVE_CITIZEN_WHERE,
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
