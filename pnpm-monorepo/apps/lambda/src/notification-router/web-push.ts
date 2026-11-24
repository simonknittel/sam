import {
  findWebPushDeliveries,
  pruneWebPushSubscriptions,
  type ApplicationContext,
  type RejectedWebPushSubscription,
} from "@sam-monorepo/application";
import { WebPushPruneReason } from "@sam-monorepo/domain";
import { setTimeout } from "node:timers/promises";
import {
  sendNotification,
  setVapidDetails,
  WebPushError,
  type RequestOptions,
} from "web-push";
import { log } from "../common/logger";
import { type Notification } from "./notification";
import { env } from "./setup";
import { toLoggableWebPushError } from "./toLoggableWebPushError";

setVapidDetails(env.BASE_URL, env.PUBLIC_VAPID_KEY, env.PRIVATE_VAPID_KEY);

const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_DEFAULT_DELAY_MS = 1_000;

/**
 * The socket of one push request can be idle for at most this time (the
 * `timeout` of web-push is an idle timeout, not a limit of the whole
 * request). A push service that does not answer must not keep the batch of
 * the router busy until the time limit of the Lambda function.
 */
export const WEB_PUSH_TIMEOUT_MILLISECONDS = 10_000;

/**
 * web-push gives the headers of the Node.js response, and Node.js writes all
 * header names in lowercase.
 */
const getRetryAfterDelayMs = (error: WebPushError) => {
  const headerValue = error.headers["retry-after"];
  if (!headerValue) return undefined;

  const numericDelaySeconds = Number(headerValue);
  if (!Number.isNaN(numericDelaySeconds) && numericDelaySeconds > 0)
    return numericDelaySeconds * 1_000;

  const retryDate = Date.parse(headerValue);
  if (Number.isNaN(retryDate)) return undefined;

  const msUntilRetry = retryDate - Date.now();
  if (msUntilRetry <= 0) return undefined;

  return msUntilRetry;
};

export const publishWebPushNotifications = async (
  context: ApplicationContext,
  notifications: Notification[],
  options?: RequestOptions,
) => {
  const deliveries = await findWebPushDeliveries(context, notifications);

  log.info("Sending Web Push notifications (before filter)", {
    count: notifications.length,
  });
  if (deliveries.length <= 0) return;

  log.info("Sending Web Push notifications (after filter)", {
    count: deliveries.length,
  });

  const subscriptionsToRemove: RejectedWebPushSubscription[] = [];
  for (const { draft, subscription } of deliveries) {
    // The keys of `public/service-worker.js` of the app
    const payload = JSON.stringify({
      title: `${draft.title} | SAM`,
      body: draft.body,
      url: draft.url,
    });

    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt += 1) {
      try {
        await sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload,
          {
            TTL: options?.TTL ?? 60 * 60 * 24,
            urgency: options?.urgency,
            timeout: WEB_PUSH_TIMEOUT_MILLISECONDS,
          },
        );
        break;
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 410 || error.statusCode === 404)
        ) {
          subscriptionsToRemove.push({
            subscriptionId: subscription.id,
            statusCode: error.statusCode,
          });
          break;
        }

        if (error instanceof WebPushError && error.statusCode === 429) {
          if (attempt < RATE_LIMIT_MAX_RETRIES) {
            const retryDelayMs =
              getRetryAfterDelayMs(error) ?? RATE_LIMIT_DEFAULT_DELAY_MS;
            log.warn("Rate limited sending web push notification, retrying", {
              subscriptionId: subscription.id,
              retryDelayMs,
              attempt: attempt + 1,
            });
            await setTimeout(retryDelayMs);
            continue;
          }

          log.error(
            "Exceeded retries after rate limit for web push notification",
            {
              subscriptionId: subscription.id,
              statusCode: error.statusCode,
              attempts: attempt + 1,
            },
          );
          break;
        }

        log.error("Error sending web push notification", {
          error: toLoggableWebPushError(error),
          subscriptionId: subscription.id,
        });
        break;
      }
    }
  }
  if (subscriptionsToRemove.length <= 0) return;
  log.info("Deleting Web Push subscriptions", {
    count: subscriptionsToRemove.length,
  });
  await pruneWebPushSubscriptions(context, {
    subscriptions: subscriptionsToRemove,
    reason: WebPushPruneReason.Expired,
  });
};
