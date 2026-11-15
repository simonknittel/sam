import type { NotificationChannel } from "@sam-monorepo/database/browser";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

/**
 * The number of unread notifications in the inbox of the citizen of the
 * actor, or 0 for a user without a citizen. An archived notification does
 * not count, also when it is unread.
 */
export const countOwnUnreadOnSiteNotifications = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<number> => {
  if (!actor.citizen) return 0;

  return context.prisma.onSiteNotification.count({
    where: {
      citizenId: actor.citizen.id,
      readAt: null,
      archivedAt: null,
    },
  });
};

/** A notification type that the citizen switched off for a channel */
export interface OwnNotificationSetting {
  readonly notificationType: string;
  readonly channel: NotificationChannel;
}

/**
 * The notification types that the citizen of the actor switched off, or
 * null for a user without a citizen
 */
export const findOwnNotificationSettings = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnNotificationSetting[] | null> => {
  if (!actor.citizen) return null;

  return context.prisma.notificationSetting.findMany({
    where: {
      citizenId: actor.citizen.id,
    },
    select: {
      notificationType: true,
      channel: true,
    },
  });
};

/** A browser that gets the web push notifications of the citizen */
export interface OwnWebPushSubscription {
  readonly id: string;
  readonly createdAt: Date;
  readonly userAgent: string | null;
  /** Identifies the browser, which knows the endpoint of its subscription */
  readonly endpoint: string;
}

/**
 * The web push subscriptions of the citizen of the actor, the newest first,
 * or an empty list for a user without a citizen. The keys of the
 * subscriptions are not in the result.
 */
export const listOwnWebPushSubscriptions = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnWebPushSubscription[]> => {
  if (!actor.citizen) return [];

  return context.prisma.webPushSubscription.findMany({
    where: {
      citizenId: actor.citizen.id,
    },
    select: {
      id: true,
      createdAt: true,
      userAgent: true,
      endpoint: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
};
