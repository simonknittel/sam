import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";

/** All lists hide a deleted citizen, thus nobody could see a new booking */
export const areActiveReceivers = async (
  prisma: ApplicationContext["prisma"],
  receiverIds: readonly string[],
): Promise<boolean> => {
  const uniqueReceiverIds = [...new Set(receiverIds)];
  const activeCount = await prisma.citizen.count({
    where: { id: { in: uniqueReceiverIds }, ...ACTIVE_CITIZEN_WHERE },
  });

  return activeCount === uniqueReceiverIds.length;
};

/** Call it after the commit of the ledger write */
export const announceSilcTransactions = async (
  context: ApplicationContext,
  transactionIds: readonly string[],
): Promise<boolean> => {
  if (transactionIds.length === 0) return true;

  return triggerNotificationsAfterSave(context, [
    {
      type: "SilcTransactionsCreated",
      payload: { transactionIds },
    },
  ]);
};
