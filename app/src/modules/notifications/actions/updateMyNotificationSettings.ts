"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { NotificationChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOTIFICATION_TYPES } from "../utils/NotificationTypes";
import { getMyNotificationSettings } from "../utils/queries";

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

        const currentlyEnabled = myCurrentSettings?.some(
          (setting) =>
            setting.notificationType === notificationType.id &&
            setting.channel === channel &&
            setting.enabledAt,
        );

        if (isEnabled !== Boolean(currentlyEnabled)) {
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
        if (change.enabled === false) {
          return prisma.notificationSetting.delete({
            where: {
              citizenId_notificationType_channel: {
                citizenId: authentication.session.entity!.id,
                notificationType: change.notificationType,
                channel: change.channel,
              },
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
            enabledAt: new Date(),
          },
          create: {
            citizenId: change.citizenId,
            notificationType: change.notificationType,
            channel: change.channel,
            enabledAt: new Date(),
          },
        });
      }),
    );

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/notifications");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
