import "./event-starting-soon/setup";

import { prisma } from "@sam-monorepo/database";
import type { ScheduledHandler } from "aws-lambda";
import { createId } from "@paralleldrive/cuid2";
import { emitEvents } from "./common/eventbridge";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";

const NOTIFICATION_MINUTES_BEFORE = 15;

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
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
        Source: "event-starting-soon",
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
