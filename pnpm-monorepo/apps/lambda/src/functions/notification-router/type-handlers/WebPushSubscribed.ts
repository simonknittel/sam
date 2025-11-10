import { prisma, type WebPushSubscription } from "@sam-monorepo/database";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { log } from "../../../common/logger";
import { env } from "../env";

setVapidDetails(env.BASE_URL, env.PUBLIC_VAPID_KEY, env.PRIVATE_VAPID_KEY);

interface Payload {
  subscriptionId: WebPushSubscription["id"];
}

export const WebPushSubscribedHandler = async (payload: Payload) => {
  /**
   * Fetch subscription from database
   */
  const subscription = await prisma.webPushSubscription.findUnique({
    where: {
      id: payload.subscriptionId,
    },
    select: {
      id: true,
      citizenId: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (!subscription) {
    log.warn("Subscription not found", {
      subscriptionId: payload.subscriptionId,
    });
    return;
  }

  /**
   * Send a test notification directly to the newly subscribed device
   * This bypasses the notification settings check since it's a confirmation notification
   */
  const notificationPayload = JSON.stringify({
    title: "Web Push aktiviert | S.A.M.",
    body: "Du erhältst ab sofort Benachrichtigungen auf diesem Gerät.",
  });

  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      notificationPayload,
      {
        TTL: 60 * 60 * 24, // 1 day
      },
    );

    log.info("Test notification sent successfully", {
      subscriptionId: subscription.id,
      citizenId: subscription.citizenId,
      endpoint: subscription.endpoint,
    });
  } catch (error) {
    if (
      error instanceof WebPushError &&
      (error.statusCode === 410 || error.statusCode === 404)
    ) {
      log.warn("Subscription is no longer valid, removing from database", {
        subscriptionId: subscription.id,
        citizenId: subscription.citizenId,
        endpoint: subscription.endpoint,
        statusCode: error.statusCode,
      });

      await prisma.webPushSubscription.delete({
        where: {
          id: subscription.id,
        },
      });
    } else {
      log.error("Error sending test notification", {
        error,
        subscriptionId: subscription.id,
        citizenId: subscription.citizenId,
        endpoint: subscription.endpoint,
      });
    }
  }
};
