import { NotificationChannel } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  getNotificationSettingInputName,
  MAXIMUM_NOTIFICATION_SETTING_INPUTS,
  NOTIFICATION_SETTING_TYPES,
  type NotificationSettingType,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { findOptOutChanges } from "../optOutChanges.js";
import { withSpan } from "../withSpan.js";
import { findOwnNotificationSettings } from "./ownNotificationReads.js";

/**
 * The longest input name has 43 characters. The limit bounds the input.
 */
const MAXIMUM_SETTING_INPUT_NAME_LENGTH = 100;

export const updateNotificationSettingsInputSchema = z.object({
  /** A type that is not in the list is switched off for the channel */
  enabled_input_names: z
    .array(z.string().max(MAXIMUM_SETTING_INPUT_NAME_LENGTH))
    .max(MAXIMUM_NOTIFICATION_SETTING_INPUTS),
});

export type UpdateNotificationSettingsInput = z.output<
  typeof updateNotificationSettingsInputSchema
>;

export interface NotificationSettingChange {
  readonly notification_type: NotificationSettingType;
  readonly channel: NotificationChannel;
}

export interface UpdateNotificationSettingsOutput {
  readonly enabled: NotificationSettingChange[];
  readonly disabled: NotificationSettingChange[];
}

interface NotificationSettingKey {
  readonly notificationType: NotificationSettingType;
  readonly channel: NotificationChannel;
}

const ALL_NOTIFICATION_SETTINGS: readonly NotificationSettingKey[] =
  Object.values(NotificationChannel).flatMap((channel) =>
    NOTIFICATION_SETTING_TYPES.map((notificationType) => ({
      notificationType,
      channel,
    })),
  );

export const updateNotificationSettings = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateNotificationSettingsInput,
): Promise<UpdateNotificationSettingsOutput> =>
  withSpan(context, "updateNotificationSettings", async () => {
    const citizenId = requireCitizen(actor).id;

    const switchedOffSettings =
      (await findOwnNotificationSettings(context, actor)) ?? [];
    const enabledInputNames = new Set(input.enabled_input_names);

    const { enabled, disabled } = findOptOutChanges(
      ALL_NOTIFICATION_SETTINGS,
      new Set(
        ALL_NOTIFICATION_SETTINGS.filter(({ channel, notificationType }) =>
          enabledInputNames.has(
            getNotificationSettingInputName(channel, notificationType),
          ),
        ),
      ),
      new Set(
        ALL_NOTIFICATION_SETTINGS.filter((setting) =>
          switchedOffSettings.some(
            (row) =>
              row.notificationType === setting.notificationType &&
              row.channel === setting.channel,
          ),
        ),
      ),
    );

    if (enabled.length > 0 || disabled.length > 0) {
      const now = context.now();

      await context.prisma.$transaction([
        ...enabled.map(({ notificationType, channel }) =>
          // deleteMany instead of delete: two overlapping saves must not
          // throw when the row is already gone
          context.prisma.notificationSetting.deleteMany({
            where: { citizenId, notificationType, channel },
          }),
        ),
        ...disabled.map(({ notificationType, channel }) =>
          context.prisma.notificationSetting.upsert({
            where: {
              citizenId_notificationType_channel: {
                citizenId,
                notificationType,
                channel,
              },
            },
            update: { disabledAt: now },
            create: { citizenId, notificationType, channel, disabledAt: now },
          }),
        ),
      ]);

      await context.audit.create([
        {
          type: AuditEventType.NOTIFICATION_SETTINGS_UPDATED,
          data: {
            citizenId,
            enabled: enabled.map(({ notificationType, channel }) => ({
              notificationType,
              channel,
            })),
            disabled: disabled.map(({ notificationType, channel }) => ({
              notificationType,
              channel,
            })),
          },
          createdById: actor.userId,
        },
      ]);
    }

    const toOutput = ({
      notificationType,
      channel,
    }: NotificationSettingKey): NotificationSettingChange => ({
      notification_type: notificationType,
      channel,
    });

    return {
      enabled: enabled.map(toOutput),
      disabled: disabled.map(toOutput),
    };
  });
