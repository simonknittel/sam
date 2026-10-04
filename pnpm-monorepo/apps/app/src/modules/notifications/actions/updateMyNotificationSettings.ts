"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { NotificationChannel } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { NOTIFICATION_TYPES } from "../utils/NotificationTypes";
import { getMyNotificationSettings } from "../utils/queries/getMyNotificationSettings";

export interface Change {
  citizenId: string;
  notificationType: string;
  channel: NotificationChannel;
  enabled: boolean;
}

/**
 * The form sends one key for each switched-on setting, thus a request never
 * has more keys than there are combinations of a notification type and a
 * channel. The limit keeps the loops of the action bounded.
 */
const MAXIMUM_FORM_KEY_COUNT =
  NOTIFICATION_TYPES.length * Object.keys(NotificationChannel).length;

const schema = z
  .record(z.string(), z.string())
  .refine((record) => Object.keys(record).length <= MAXIMUM_FORM_KEY_COUNT);

export const updateMyNotificationSettings = createAuthenticatedAction(
  "updateMyNotificationSettings",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     *
     */
    const myCurrentSettings = await getMyNotificationSettings();

    const newlyEnabledSettings = Object.keys(data).filter((inputName) => {
      for (const channelKey of Object.keys(NotificationChannel)) {
        const channel = channelKey as NotificationChannel;
        if (inputName.startsWith(`${channel}_`)) return true;
      }
      return false;
    });

    const changes: Change[] = [];
    for (const channelKey of Object.keys(NotificationChannel)) {
      const channel = channelKey as NotificationChannel;

      for (const notificationType of NOTIFICATION_TYPES) {
        const inputName = `${channel}_${notificationType.id}`;
        const isEnabled = newlyEnabledSettings.includes(inputName);

        // Opt-out model: the existence of a row means the notification type
        // is disabled.
        const currentlyEnabled = !myCurrentSettings?.some(
          (setting) =>
            setting.notificationType === notificationType.id &&
            setting.channel === channel,
        );

        if (isEnabled !== currentlyEnabled) {
          changes.push({
            citizenId: authentication.session.entity.id,
            notificationType: notificationType.id,
            channel: channel,
            enabled: isEnabled,
          });
        }
      }
    }

    await prisma.$transaction(
      changes.map((change) => {
        if (change.enabled === true) {
          // deleteMany instead of delete so overlapping debounced submits
          // don't throw when the row is already gone
          return prisma.notificationSetting.deleteMany({
            where: {
              citizenId: authentication.session.entity!.id,
              notificationType: change.notificationType,
              channel: change.channel,
            },
          });
        }

        return prisma.notificationSetting.upsert({
          where: {
            citizenId_notificationType_channel: {
              citizenId: authentication.session.entity!.id,
              notificationType: change.notificationType,
              channel: change.channel,
            },
          },
          update: {
            disabledAt: new Date(),
          },
          create: {
            citizenId: change.citizenId,
            notificationType: change.notificationType,
            channel: change.channel,
            disabledAt: new Date(),
          },
        });
      }),
    );

    refresh();

    if (changes.length > 0)
      await createAuditEvents([
        {
          type: AuditEventType.NOTIFICATION_SETTINGS_UPDATED,
          data: {
            citizenId: authentication.session.entity.id,
            enabled: changes
              .filter((change) => change.enabled)
              .map(({ notificationType, channel }) => ({
                notificationType,
                channel,
              })),
            disabled: changes
              .filter((change) => !change.enabled)
              .map(({ notificationType, channel }) => ({
                notificationType,
                channel,
              })),
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
