import {
  findPayoutStartedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { getSincomePayoutStartedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  cycleId: string;
}

export const ProfitDistributionPayoutStartedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPayoutStartedRecipients(context, {
    cycleId: payload.cycleId,
  });
  if (!result) return;

  const notificationPayload = {
    cycleId: result.cycle.id,
    cycleTitle: result.cycle.title,
  };
  const text = getSincomePayoutStartedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "sincome_payout_started" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/sincome/${result.cycle.id}`,
    })),
  );
};
