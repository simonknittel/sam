"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { NotificationChannel } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOTIFICATION_TYPES } from "../utils/NotificationTypes";
import { getMyNotificationSettings } from "../utils/queries/getMyNotificationSettings";

export interface Change {
  citizenId: string;
  notificationType: string;
  channel: NotificationChannel;
  enabled: boolean;
}

const schema = z.record(z.string(), z.string());

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
     * Further validate the request
     */
    if (Array.from(formData.keys()).length > 100)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     *
     */
    const myCurrentSettings = await getMyNotificationSettings();

    const newlyEnabledSettings = Array.from(formData.keys()).filter(
      (inputName) => {
        for (const channelKey of Object.keys(NotificationChannel)) {
          const channel = channelKey as NotificationChannel;
          if (inputName.startsWith(`${channel}_`)) return true;
        }
        return false;
      },
    );

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

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/notifications");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
