import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";

export const unarchiveOnSiteNotificationInputSchema = z.object({
  notification_id: idSchema,
});

export type UnarchiveOnSiteNotificationInput = z.output<
  typeof unarchiveOnSiteNotificationInputSchema
>;

export interface UnarchiveOnSiteNotificationOutput {
  readonly notification_id: string;
  /**
   * False when the notification is not an own notification or is not
   * archived
   */
  readonly changed: boolean;
}

export const unarchiveOnSiteNotification = async (
  context: ApplicationContext,
  actor: Actor,
  input: UnarchiveOnSiteNotificationInput,
): Promise<UnarchiveOnSiteNotificationOutput> => {
  const citizenId = requireCitizen(actor).id;

  const { count } = await context.prisma.onSiteNotification.updateMany({
    where: {
      id: input.notification_id,
      citizenId,
      archivedAt: { not: null },
    },
    data: {
      archivedAt: null,
    },
  });

  if (count > 0)
    await context.audit.create([
      {
        type: AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
        data: {
          citizenId,
          notificationId: input.notification_id,
        },
        createdById: actor.userId,
      },
    ]);

  return { notification_id: input.notification_id, changed: count > 0 };
};
