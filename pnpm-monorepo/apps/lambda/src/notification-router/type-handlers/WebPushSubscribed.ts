import {
  findWebPushSubscription,
  pruneWebPushSubscriptions,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type WebPushSubscription } from "@sam-monorepo/database";
import { WebPushPruneReason } from "@sam-monorepo/domain";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { log } from "../../common/logger";
import { env } from "../setup";
import { toLoggableWebPushError } from "../toLoggableWebPushError";
import { WEB_PUSH_TIMEOUT_MILLISECONDS } from "../web-push";

setVapidDetails(env.BASE_URL, env.PUBLIC_VAPID_KEY, env.PRIVATE_VAPID_KEY);

interface Payload {
  subscriptionId: WebPushSubscription["id"];
}

export const WebPushSubscribedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const subscription = await findWebPushSubscription(context, {
    subscriptionId: payload.subscriptionId,
  });

  if (!subscription) {
    log.warn("Subscription not found", {
      subscriptionId: payload.subscriptionId,
    });
    return;
  }

  // A confirmation goes directly to the new device. The notification
  // settings do not apply to it.
  const notificationPayload = JSON.stringify({
    title: "Browser-Benachrichtigungen aktiviert | SAM",
    body: "Du erhältst ab sofort Benachrichtigungen auf diesem Gerät.",
  });

  try {
    await sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      notificationPayload,
      {
        TTL: 60 * 60 * 24, // 1 day
        urgency: "high",
        timeout: WEB_PUSH_TIMEOUT_MILLISECONDS,
      },
    );

    log.info("Test notification sent successfully", {
      subscriptionId: subscription.id,
    });
  } catch (error) {
    if (
      error instanceof WebPushError &&
      (error.statusCode === 410 || error.statusCode === 404)
    ) {
      log.warn("Subscription is no longer valid, removing from database", {
        subscriptionId: subscription.id,
        statusCode: error.statusCode,
      });

      await pruneWebPushSubscriptions(context, {
        subscriptions: [
          { subscriptionId: subscription.id, statusCode: error.statusCode },
        ],
        reason: WebPushPruneReason.Invalid,
      });
    } else {
      log.error("Error sending test notification", {
        error: toLoggableWebPushError(error),
        subscriptionId: subscription.id,
      });
    }
  }
};
