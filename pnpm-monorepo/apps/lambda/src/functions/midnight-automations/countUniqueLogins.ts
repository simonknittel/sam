import { prisma } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const countUniqueLogins = async () => {
  await captureAsyncFunc("countUniqueLogins", async () => {
    // Get the previous day (since this runs at midnight)
    const now = new Date();
    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);

    // Set to start of the previous day (00:00:00)
    const startOfDay = new Date(previousDay);
    startOfDay.setHours(0, 0, 0, 0);

    // Set to end of the previous day (23:59:59.999)
    const endOfDay = new Date(previousDay);
    endOfDay.setHours(23, 59, 59, 999);

    const uniqueLoginCount = await captureAsyncFunc(
      "count unique logins",
      () =>
        prisma.user.count({
          where: {
            lastSeenAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
    );

    await captureAsyncFunc("save daily login count", () =>
      prisma.dailyLoginCount.upsert({
        where: {
          date: startOfDay,
        },
        update: {
          count: uniqueLoginCount,
        },
        create: {
          date: startOfDay,
          count: uniqueLoginCount,
        },
      }),
    );

    log.info("Saved unique logins for previous day", {
      date: startOfDay.toISOString(),
      count: uniqueLoginCount,
    });
  });
};
