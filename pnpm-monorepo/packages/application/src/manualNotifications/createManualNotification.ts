import {
  AuditEventType,
  MANUAL_NOTIFICATION_BODY_MAX_LENGTH,
  MANUAL_NOTIFICATION_MAX_RECEIVER_CITIZENS,
  MANUAL_NOTIFICATION_MAX_RECEIVER_ROLES,
  MANUAL_NOTIFICATION_TITLE_MAX_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { requireVisibleRoles } from "../roles/roleVisibility.js";
import { requireActiveCitizens } from "../spynet/requireActiveCitizens.js";
import { withSpan } from "../withSpan.js";
import { ManualNotificationErrorMessage } from "./manualNotificationErrors.js";
import {
  MANUAL_NOTIFICATION_SELECT,
  toManualNotificationOutput,
  type ManualNotificationOutput,
} from "./manualNotificationOutput.js";

export const createManualNotificationInputSchema = z.object({
  title: z.string().trim().min(1).max(MANUAL_NOTIFICATION_TITLE_MAX_LENGTH),
  body: z.string().trim().min(1).max(MANUAL_NOTIFICATION_BODY_MAX_LENGTH),
  citizen_ids: z
    .array(idSchema)
    .max(MANUAL_NOTIFICATION_MAX_RECEIVER_CITIZENS)
    .default([])
    .describe("The citizens who receive the notification."),
  role_ids: z
    .array(idSchema)
    .max(MANUAL_NOTIFICATION_MAX_RECEIVER_ROLES)
    .default([])
    .describe(
      "The roles whose members receive the notification, from list_roles.",
    ),
});

export type CreateManualNotificationInput = z.output<
  typeof createManualNotificationInputSchema
>;

export interface CreateManualNotificationOutput {
  readonly notification: ManualNotificationOutput;
  /**
   * False when the notification is saved, but the delivery failed. The
   * notification stands, thus the caller must not create it again.
   */
  readonly notifications_sent: boolean;
}

/**
 * Sends a notification with its own title and body to the selected citizens
 * and to the members of the selected roles. Only the citizens who can log in
 * receive it (see `findManualNotificationRecipients()`). Also needs
 * `citizen;read` when citizens are selected, like the citizen picker of the
 * form.
 *
 * @throws ValidationError when no receiver is selected, when a citizen does
 * not exist or is deleted, or when a role does not exist or is not visible
 */
export const createManualNotification = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateManualNotificationInput,
): Promise<CreateManualNotificationOutput> =>
  withSpan(context, "createManualNotification", async () => {
    requirePermission(actor, "manualNotification", "manage");
    const sender = requireCitizen(actor);

    const citizenIds = [...new Set(input.citizen_ids)];
    const roleIds = [...new Set(input.role_ids)];
    if (citizenIds.length <= 0 && roleIds.length <= 0)
      throw new ValidationError(ManualNotificationErrorMessage.NoReceivers);

    if (citizenIds.length > 0) {
      requirePermission(actor, "citizen", "read");
      await requireActiveCitizens(
        context,
        citizenIds,
        ManualNotificationErrorMessage.UnknownCitizen,
      );
    }
    await requireVisibleRoles(
      context,
      actor,
      roleIds,
      ManualNotificationErrorMessage.UnknownRole,
    );

    const notification = await context.prisma.manualNotification.create({
      data: {
        createdBy: { connect: { id: sender.id } },
        title: input.title,
        body: input.body,
        receiverCitizens: {
          create: citizenIds.map((citizenId) => ({
            citizen: { connect: { id: citizenId } },
          })),
        },
        receiverRoles: {
          create: roleIds.map((roleId) => ({
            role: { connect: { id: roleId } },
          })),
        },
      },
      select: MANUAL_NOTIFICATION_SELECT,
    });

    await context.audit.create([
      {
        type: AuditEventType.MANUAL_NOTIFICATION_CREATED,
        data: {
          manualNotificationId: notification.id,
          title: input.title,
          receiverCitizenIds: citizenIds,
          receiverRoleIds: roleIds,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      notification: toManualNotificationOutput(notification),
      notifications_sent: await triggerNotificationsAfterSave(context, [
        {
          type: "ManualNotificationCreated",
          payload: { manualNotificationId: notification.id },
        },
      ]),
    };
  });
