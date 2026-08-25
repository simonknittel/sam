import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Entity } from "@sam-monorepo/database/client";
import { buildActivePenaltyEntryWhere } from "../utils/penaltyEntryFilters";

/**
 * The penalty points a citizen currently holds. The caller does the
 * authorization, because the necessary permission is different for the own
 * citizen and for other citizens.
 */
export const sumPenaltyPointsOfCitizen = withTrace(
  "sumPenaltyPointsOfCitizen",
  async (citizenId: Entity["id"]) => {
    const aggregation = await prisma.penaltyEntry.aggregate({
      where: {
        citizenId,
        ...buildActivePenaltyEntryWhere(),
      },
      _sum: {
        points: true,
      },
    });

    return aggregation._sum.points ?? 0;
  },
);
