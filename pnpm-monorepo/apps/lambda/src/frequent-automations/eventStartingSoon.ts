import { prisma } from "@sam-monorepo/database";
import { createId } from "@paralleldrive/cuid2";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

const NOTIFICATION_MINUTES_BEFORE = 15;

export const eventStartingSoon = async () => {
  await captureAsyncFunc("eventStartingSoon", async () => {
    void log.info("Checking for events starting soon");

    const now = new Date();
    const notificationWindow = new Date(
      now.getTime() + NOTIFICATION_MINUTES_BEFORE * 60 * 1000,
    );

    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: notificationWindow,
        },
      },
      select: {
        id: true,
        name: true,
        startTime: true,
      },
    });

    void log.info("Found events starting soon", {
      count: events.length,
      eventIds: events.map((e) => e.id),
    });

    if (events.length === 0) return;

    await emitEvents(
      events.map((evt) => ({
        Source: "frequent-automations",
        DetailType: "NotificationRequested",
        Detail: JSON.stringify({
          type: "EventStarting",
          payload: {
            eventId: evt.id,
          },
          requestId: createId(),
        }),
      })),
    );
  });
};
