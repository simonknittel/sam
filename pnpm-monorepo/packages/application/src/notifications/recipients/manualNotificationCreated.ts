import { findClearedCitizens } from "../../auth/clearedCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindManualNotificationRecipientsInput {
  readonly manualNotificationId: string;
}

/** The recipients of one manual notification with its wording */
export interface ManualNotificationRecipients {
  readonly notification: {
    readonly id: string;
    readonly title: string;
    readonly body: string;
  };
  readonly recipients: Recipient[];
}

/**
 * The cleared citizens (see `findClearedCitizens()`) that the sender
 * selected, or who have a selected role as an effective role (inheritance
 * and level gate, the same as the session). Each citizen once. The sender is
 * not excluded: a sender who selects a role that includes them gets the
 * notification too. Null when the notification does not exist.
 */
export const findManualNotificationRecipients = async (
  context: ApplicationContext,
  input: FindManualNotificationRecipientsInput,
): Promise<ManualNotificationRecipients | null> => {
  const notification = await context.prisma.manualNotification.findUnique({
    where: { id: input.manualNotificationId },
    select: {
      id: true,
      title: true,
      body: true,
      receiverCitizens: { select: { citizenId: true } },
      receiverRoles: { select: { roleId: true } },
    },
  });
  if (!notification) return null;

  const selectedCitizenIds = new Set(
    notification.receiverCitizens.map((receiver) => receiver.citizenId),
  );
  const selectedRoleIds = new Set(
    notification.receiverRoles.map((receiver) => receiver.roleId),
  );

  const clearedCitizens = await findClearedCitizens(context, {});

  return {
    notification: {
      id: notification.id,
      title: notification.title,
      body: notification.body,
    },
    recipients: Array.from(clearedCitizens)
      .filter(
        ([citizenId, { roleIds }]) =>
          selectedCitizenIds.has(citizenId) ||
          !roleIds.isDisjointFrom(selectedRoleIds),
      )
      .map(([citizenId]) => ({ citizenId })),
  };
};
