import {
  findManualNotificationRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type ManualNotification } from "@sam-monorepo/database";
import { publishNotifications } from "../publish";

interface Payload {
  manualNotificationId: ManualNotification["id"];
}

export const ManualNotificationCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findManualNotificationRecipients(context, {
    manualNotificationId: payload.manualNotificationId,
  });
  if (!result) return;

  const { notification } = result;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "manual_notification" as const,
      payload: { title: notification.title, body: notification.body },
      title: notification.title,
      body: notification.body,
    })),
  );
};
