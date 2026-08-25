import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Entity } from "@sam-monorepo/database/client";

/**
 * The penalty points a citizen currently holds: the sum of the entries which
 * are neither deleted nor expired. The caller does the authorization,
 * because the necessary permission is different for the own citizen and for
 * other citizens.
 */
export const sumPenaltyPointsOfCitizen = withTrace(
  "sumPenaltyPointsOfCitizen",
  async (citizenId: Entity["id"]) => {
    const now = new Date();

    const aggregation = await prisma.penaltyEntry.aggregate({
      where: {
        citizenId,
        deletedAt: null,
        OR: [
          {
            expiresAt: {
              gte: now,
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      _sum: {
        points: true,
      },
    });

    return aggregation._sum.points ?? 0;
  },
);
