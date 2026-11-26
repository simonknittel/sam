import type { NotificationChannel } from "@sam-monorepo/database/browser";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

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

/** A user without a citizen has no inbox, thus the default applies */
export const isOwnInboxAutoOpenEnabled = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<boolean> => {
  if (!actor.citizen) return true;

  const citizen = await context.prisma.citizen.findUnique({
    where: { id: actor.citizen.id },
    select: { inboxAutoOpenDisabledAt: true },
  });

  return !citizen?.inboxAutoOpenDisabledAt;
};

export interface OwnWebPushSubscription {
  readonly id: string;
  readonly createdAt: Date;
  readonly userAgent: string | null;
  /** Identifies the browser, which knows the endpoint of its subscription */
  readonly endpoint: string;
}

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
