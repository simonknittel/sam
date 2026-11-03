import {
  findSilcTransactionRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type SilcTransaction } from "@sam-monorepo/database";
import { getSilcTransactionCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  transactionIds: SilcTransaction["id"][];
}

export const SilcTransactionsCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const recipients = await findSilcTransactionRecipients(context, {
    transactionIds: payload.transactionIds,
  });

  await publishNotifications(
    context,
    recipients.map((recipient) => {
      const notificationPayload = {
        transactionId: recipient.transactionId,
        value: recipient.value,
        description: recipient.description,
      };

      return {
        receiverId: recipient.citizenId,
        notificationType: "silc_transaction_created" as const,
        payload: notificationPayload,
        ...getSilcTransactionCreatedText(notificationPayload),
      };
    }),
  );
};
