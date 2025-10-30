import { prisma } from "@sam-monorepo/database";
import { getAuecPerSilc } from "../../../common/profit-distribution/utils/getAuecPerSilc";
import { getTotalSilc } from "../../../common/profit-distribution/utils/getTotalSilc";
import { novu, publishNovuNotifications } from "../novu";

interface Change {
  citizenId: string;
  attribute: string;
  enabled: boolean;
}

interface Payload {
  cycleId: string;
  changes: Change[];
}

export const profitDistributionPayoutDisbursedHandler = async (
  payload: Payload,
) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `profitDistributionCycle;read` permission

  if (!novu) return;

  const cycle = await prisma.profitDistributionCycle.findUnique({
    where: {
      id: payload.cycleId,
    },
    select: {
      title: true,
      auecProfit: true,
      participants: {
        select: {
          citizenId: true,
          silcBalanceSnapshot: true,
          cededAt: true,
        },
      },
    },
  });
  if (!cycle || cycle.participants.length === 0) return;

  // Filter participants who have gotten the 'disbursed' attribute enabled in the changes
  const changesWithDisbursedEnabled = payload.changes.filter(
    (change) => change.attribute === "disbursed" && change.enabled,
  );
  const participantsWithDisbursedEnabled = cycle.participants.filter(
    (participant) =>
      changesWithDisbursedEnabled.some(
        (change) => change.citizenId === participant.citizenId,
      ),
  );

  /**
   * Trigger notifications
   */
  await publishNovuNotifications(
    participantsWithDisbursedEnabled.map((participant) => {
      const aUEC =
        (participant.silcBalanceSnapshot || 0) *
        getAuecPerSilc(cycle.auecProfit || 0, getTotalSilc(cycle.participants));

      return {
        to: {
          subscriberId: participant.citizenId,
        },
        workflowId: "sincome-payout-received",
        payload: {
          title: cycle.title,
          aUEC: aUEC.toLocaleString("de-DE"),
        },
      };
    }),
  );
};
