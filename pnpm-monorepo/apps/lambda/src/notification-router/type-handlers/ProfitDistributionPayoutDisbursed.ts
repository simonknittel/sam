import {
  findPayoutDisbursedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { getSincomePayoutDisbursedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Change {
  citizenId: string;
  attribute: string;
  enabled: boolean;
}

interface Payload {
  cycleId: string;
  changes: Change[];
}

export const ProfitDistributionPayoutDisbursedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPayoutDisbursedRecipients(context, {
    cycleId: payload.cycleId,
    changes: payload.changes,
  });
  if (!result) return;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => {
      const notificationPayload = {
        cycleId: result.cycle.id,
        cycleTitle: result.cycle.title,
        auecAmount: recipient.auecAmount,
      };

      return {
        receiverId: recipient.citizenId,
        notificationType: "sincome_payout_disbursed" as const,
        payload: notificationPayload,
        ...getSincomePayoutDisbursedText(notificationPayload),
        url: `/app/sincome/${result.cycle.id}`,
      };
    }),
  );
};
