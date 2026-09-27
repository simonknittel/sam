import { prisma } from "@sam-monorepo/database";
import {
  AuditEventType,
  getYesterdayDateColumnValue,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const countUniqueLogins = async () => {
  await captureAsyncFunc("countUniqueLogins", async () => {
    const now = new Date();
    const countedDay = getYesterdayDateColumnValue(now);

    /**
     * The first and the last moment of the counted day. The function runs in
     * the time zone of the organization (`TZ`, see the Terraform module),
     * thus the local time of a `Date` is the time of the organization.
     */
    const startOfDay = new Date(now);
    startOfDay.setDate(startOfDay.getDate() - 1);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const uniqueLoginCount = await captureAsyncFunc("count unique logins", () =>
      prisma.user.count({
        where: {
          lastSeenAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    );

    /**
     * A run that repeats later in the night (for example after an error in a
     * later job) keeps the count of the first run, see
     * `DailyLoginCount_date_key`. A user who visits again after midnight gets
     * a new `lastSeenAt` and is then not in the counted day anymore, thus the
     * first count is the most correct.
     */
    const created = await captureAsyncFunc("save daily login count", () =>
      prisma.dailyLoginCount.createMany({
        data: [{ date: countedDay, count: uniqueLoginCount }],
        skipDuplicates: true,
      }),
    );
    if (created.count <= 0) {
      log.info("The unique logins of the previous day are counted already", {
        date: startOfDay.toISOString(),
      });
      return;
    }

    await createAuditEvents([
      {
        type: AuditEventType.UNIQUE_LOGINS_COUNTED,
        data: {
          date: startOfDay.toISOString(),
          count: uniqueLoginCount,
        },
      },
    ]);

    log.info("Saved unique logins for previous day", {
      date: startOfDay.toISOString(),
      count: uniqueLoginCount,
    });
  });
};
