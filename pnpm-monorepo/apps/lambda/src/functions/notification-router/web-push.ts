import {
  NotificationChannel,
  prisma,
  type Entity,
} from "@sam-monorepo/database";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { log } from "../../common/logger";
import { env } from "./env";

setVapidDetails(env.BASE_URL, env.PUBLIC_VAPID_KEY, env.PRIVATE_VAPID_KEY);

interface Notification {
  readonly receiverId: Entity["id"];
  readonly notificationType: string;
  readonly title: string;
  readonly body: string;
  readonly url?: string;
}

const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_DEFAULT_DELAY_MS = 1_000;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getRetryAfterDelayMs = (error: WebPushError) => {
  const headerValue =
    error.headers["retry-after"] ??
    error.headers["Retry-After"] ??
    error.headers["Retry-after"];
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
  notifications: Notification[],
) => {
  const citizens = await prisma.entity.findMany({
    where: {
      id: {
        in: notifications.map((n) => n.receiverId),
      },
    },
    select: {
      id: true,
      notificationSettings: true,
      webPushSubscriptions: true,
    },
  });
  if (citizens.length <= 0) return;

  log.info("Sending Web Push notifications (before filter)", {
    count: notifications.length,
  });

  const filteredNotifications = notifications
    .filter((notification) => {
      const citizen = citizens.find((c) => c.id === notification.receiverId);
      if (!citizen) return false;

      const setting = citizen.notificationSettings.find(
        (s) =>
          s.channel === NotificationChannel.WEB_PUSH &&
          s.notificationType === notification.notificationType,
      );
      if (!setting) return false;

      if (citizen.webPushSubscriptions.length <= 0) return false;

      return true;
    })
    .flatMap((notification) => {
      const citizen = citizens.find((c) => c.id === notification.receiverId)!;

      return citizen.webPushSubscriptions.map((sub) => ({
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload: JSON.stringify({
          title: `${notification.title} | S.A.M.`,
          body: notification.body,
          url: notification.url,
        }),
      }));
    });
  if (filteredNotifications.length <= 0) return;

  log.info("Sending Web Push notifications (after filter)", {
    count: filteredNotifications.length,
  });

  const subscriptionsToRemove: string[] = [];
  for (const { subscription, payload } of filteredNotifications) {
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt += 1) {
      try {
        await sendNotification(subscription, payload, {
          TTL: 60 * 60 * 24, // 1 day
        });
        break;
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 410 || error.statusCode === 404)
        ) {
          subscriptionsToRemove.push(subscription.endpoint);
          break;
        }

        if (error instanceof WebPushError && error.statusCode === 429) {
          if (attempt < RATE_LIMIT_MAX_RETRIES) {
            const retryDelayMs =
              getRetryAfterDelayMs(error) ?? RATE_LIMIT_DEFAULT_DELAY_MS;
            void log.warn(
              "Rate limited sending web push notification, retrying",
              {
                endpoint: subscription.endpoint,
                retryDelayMs,
                attempt: attempt + 1,
              },
            );
            await sleep(retryDelayMs);
            continue;
          }

          void log.error(
            "Exceeded retries after rate limit for web push notification",
            {
              endpoint: subscription.endpoint,
              statusCode: error.statusCode,
              attempts: attempt + 1,
            },
          );
          break;
        }

        void log.error("Error sending web push notification", {
          error,
          subscription,
        });
        break;
      }
    }
  }
  if (subscriptionsToRemove.length <= 0) return;
  log.info("Deleting Web Push subscriptions", {
    count: subscriptionsToRemove.length,
  })
  await prisma.webPushSubscription.deleteMany({
    where: {
      endpoint: {
        in: subscriptionsToRemove,
      },
    },
  });
};
