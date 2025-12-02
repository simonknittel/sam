import { prisma, StatisticType } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const countShips = async () => {
  await captureAsyncFunc("countShips", async () => {
    const shipCount = await captureAsyncFunc("count ships", () =>
      prisma.ship.count(),
    );

    await captureAsyncFunc("save statistic", () =>
      prisma.statistic.create({
        data: {
          type: StatisticType.SHIP_COUNT,
          value: shipCount,
        },
      }),
    );

    log.info("Saved ship count statistic", { count: shipCount });
  });
};
