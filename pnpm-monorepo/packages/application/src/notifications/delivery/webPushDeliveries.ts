import { NotificationChannel } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  isAllowedWebPushEndpointUrl,
  type WebPushPruneReason,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";

export interface WebPushSubscriptionTarget {
  readonly id: string;
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}

/** One push message: one draft to one subscription of its receiver */
export interface WebPushDelivery<Draft> {
  readonly draft: Draft;
  readonly subscription: WebPushSubscriptionTarget;
}

/**
 * The subscriptions that get the drafts. A draft gets no delivery when its
 * receiver disabled its notification type for web push or has no
 * subscription. A subscription with an endpoint that is not allowed gets no
 * delivery.
 */
export const findWebPushDeliveries = async <
  Draft extends {
    readonly receiverId: string;
    readonly notificationType: string;
  },
>(
  context: ApplicationContext,
  drafts: readonly Draft[],
): Promise<WebPushDelivery<Draft>[]> => {
  const citizens = await context.prisma.citizen.findMany({
    where: {
      id: {
        in: drafts.map((draft) => draft.receiverId),
      },
    },
    select: {
      id: true,
      notificationSettings: {
        where: {
          channel: NotificationChannel.WEB_PUSH,
        },
        select: {
          notificationType: true,
        },
      },
      // The Prisma client leaves out the keys of a subscription by default,
      // thus the delivery selects them explicitly
      webPushSubscriptions: {
        select: {
          id: true,
          endpoint: true,
          p256dh: true,
          auth: true,
        },
      },
    },
  });
  const citizensById = new Map(
    citizens.map((citizen) => [citizen.id, citizen]),
  );

  return drafts.flatMap((draft) => {
    const citizen = citizensById.get(draft.receiverId);
    if (!citizen) return [];

    // Opt-out model: a NotificationSetting row means the citizen disabled
    // this notification type for web push.
    const disabledSetting = citizen.notificationSettings.find(
      (setting) => setting.notificationType === draft.notificationType,
    );
    if (disabledSetting) return [];

    return citizen.webPushSubscriptions
      .filter((subscription) =>
        isAllowedWebPushEndpointUrl(subscription.endpoint),
      )
      .map((subscription) => ({
        draft,
        subscription: {
          id: subscription.id,
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
      }));
  });
};

export interface FindWebPushSubscriptionInput {
  readonly subscriptionId: string;
}

/** The subscription with its keys, or null when it does not exist */
export const findWebPushSubscription = async (
  context: ApplicationContext,
  input: FindWebPushSubscriptionInput,
): Promise<
  (WebPushSubscriptionTarget & { readonly citizenId: string }) | null
> => {
  const subscription = await context.prisma.webPushSubscription.findUnique({
    where: {
      id: input.subscriptionId,
    },
    select: {
      id: true,
      citizenId: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
  if (!subscription) return null;

  return {
    id: subscription.id,
    citizenId: subscription.citizenId,
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
};

export interface RejectedWebPushSubscription {
  readonly subscriptionId: string;
  /** The HTTP status of the answer of the push service */
  readonly statusCode: number;
}

export interface PruneWebPushSubscriptionsInput {
  readonly subscriptions: readonly RejectedWebPushSubscription[];
  readonly reason: WebPushPruneReason;
}

/** The columns of a deleted subscription that its audit event needs */
export interface DeletedWebPushSubscription {
  readonly id: string;
  readonly citizenId: string;
  readonly userAgent: string | null;
}

/**
 * Deletes the subscriptions, and writes one audit event with each deleted
 * subscription, its citizen and its user agent. When no subscription was
 * deleted (all rows were gone), the function writes no audit event.
 */
export const pruneWebPushSubscriptions = async (
  context: ApplicationContext,
  input: PruneWebPushSubscriptionsInput,
): Promise<{ readonly count: number }> => {
  const statusCodesBySubscriptionId = new Map(
    input.subscriptions.map((subscription) => [
      subscription.subscriptionId,
      subscription.statusCode,
    ]),
  );

  /**
   * RETURNING gives only the rows that this statement deleted, not a row
   * that a different transaction deleted first
   */
  const deletedSubscriptions = await context.prisma.$queryRaw<
    DeletedWebPushSubscription[]
  >`
    DELETE FROM "WebPushSubscription"
    WHERE "id" = ANY(${[...statusCodesBySubscriptionId.keys()]}::text[])
    RETURNING "id", "citizenId", "userAgent"
  `;
  if (deletedSubscriptions.length <= 0) return { count: 0 };

  await context.audit.create([
    {
      type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED_V2,
      data: {
        reason: input.reason,
        subscriptions: deletedSubscriptions.map((subscription) => ({
          subscriptionId: subscription.id,
          citizenId: subscription.citizenId,
          userAgent: subscription.userAgent,
          statusCode: statusCodesBySubscriptionId.get(subscription.id)!,
        })),
      },
      createdById: null,
    },
  ]);

  return { count: deletedSubscriptions.length };
};
