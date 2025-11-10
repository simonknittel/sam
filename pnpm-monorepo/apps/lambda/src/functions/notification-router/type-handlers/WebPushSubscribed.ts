import { prisma, type Entity } from "@sam-monorepo/database";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { log } from "../../../common/logger";
import { env } from "../env";

setVapidDetails(env.BASE_URL, env.PUBLIC_VAPID_KEY, env.PRIVATE_VAPID_KEY);

interface Payload {
  citizenId: Entity["id"];
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export const WebPushSubscribedHandler = async (payload: Payload) => {
  /**
   * Send a test notification directly to the newly subscribed device
   * This bypasses the notification settings check since it's a confirmation notification
   */
  const notificationPayload = JSON.stringify({
    title: "Web Push aktiviert | S.A.M.",
    body: "Du erhältst ab sofort Benachrichtigungen auf diesem Gerät.",
  });

  try {
    await sendNotification(payload.subscription, notificationPayload, {
      TTL: 60 * 60 * 24, // 1 day
    });

    log.info("Test notification sent successfully", {
      citizenId: payload.citizenId,
      endpoint: payload.subscription.endpoint,
    });
  } catch (error) {
    if (
      error instanceof WebPushError &&
      (error.statusCode === 410 || error.statusCode === 404)
    ) {
      log.warn("Subscription is no longer valid, removing from database", {
        citizenId: payload.citizenId,
        endpoint: payload.subscription.endpoint,
        statusCode: error.statusCode,
      });

      await prisma.webPushSubscription.deleteMany({
        where: {
          endpoint: payload.subscription.endpoint,
        },
      });
    } else {
      log.error("Error sending test notification", {
        error,
        citizenId: payload.citizenId,
        endpoint: payload.subscription.endpoint,
      });
    }
  }
};
