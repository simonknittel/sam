import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS,
  type ParsedOnSiteNotificationPayload,
} from "@sam-monorepo/domain";
import { findClearedCitizens } from "../../auth/clearedCitizens.js";
import type { ApplicationContext } from "../../context.js";

/** One on-site notification for one receiver, before the store writes it */
export type OnSiteNotificationDraft = {
  readonly receiverId: string;
} & ParsedOnSiteNotificationPayload;

/** A written on-site notification, with the fields of the realtime event */
export interface StoredOnSiteNotification {
  readonly id: string;
  readonly citizenId: string;
  readonly notificationType: string;
  readonly payload: Prisma.JsonValue;
  readonly payloadVersion: number;
  readonly createdAt: Date;
}

/**
 * Writes one on-site notification for each draft of a cleared receiver (see
 * `findClearedCitizens()`). A receiver that is deleted, that has no user, a
 * banned user or an unconfirmed email, or that does not have the effective
 * `login;manage` gets no notification on any channel. This is the only
 * place that must check this clearance rule: a recipient rule checks the
 * rules of its feature, and the other channels send only to the receivers of
 * the written rows. On-site is always on, thus the settings of the citizen
 * do not filter the rows (they filter only web push).
 */
export const storeOnSiteNotifications = async (
  context: ApplicationContext,
  drafts: readonly OnSiteNotificationDraft[],
): Promise<StoredOnSiteNotification[]> => {
  if (drafts.length <= 0) return [];

  const clearedReceivers = await findClearedCitizens(context, {
    id: {
      in: [...new Set(drafts.map((draft) => draft.receiverId))],
    },
  });

  const clearedDrafts = drafts.filter((draft) =>
    clearedReceivers.has(draft.receiverId),
  );
  if (clearedDrafts.length <= 0) return [];

  const rows = await context.prisma.onSiteNotification.createManyAndReturn({
    data: clearedDrafts.map((draft) => ({
      citizenId: draft.receiverId,
      notificationType: draft.notificationType,
      payload: draft.payload,
      payloadVersion:
        ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS[draft.notificationType],
    })),
    select: {
      id: true,
      citizenId: true,
      notificationType: true,
      payload: true,
      payloadVersion: true,
      createdAt: true,
    },
  });

  context.log.info("Created on-site notifications", { count: rows.length });

  await context.audit.create([
    {
      type: AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
      data: {
        count: rows.length,
        notificationTypes: [
          ...new Set(rows.map((row) => row.notificationType)),
        ],
      },
      createdById: null,
    },
  ]);

  return rows;
};
