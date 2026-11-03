import {
  findPayoutReminderRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { getSincomePayoutReminderText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  cycleId: string;
}

export const ProfitDistributionPayoutReminderHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPayoutReminderRecipients(context, {
    cycleId: payload.cycleId,
  });
  if (!result) return;

  const notificationPayload = {
    cycleId: result.cycle.id,
    cycleTitle: result.cycle.title,
    payoutEndsAt: result.cycle.payoutEndsAt.toISOString(),
  };
  const text = getSincomePayoutReminderText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "sincome_payout_reminder" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/sincome/${result.cycle.id}`,
    })),
  );
};
