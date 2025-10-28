import { prisma } from "@/db";
import { isNovuEnabled, publishNovuNotifications } from "@/modules/novu/utils";
import type { Change } from "@/modules/profit-distribution/actions/updateParticipantAttribute";
import { getAuecPerSilc } from "@/modules/profit-distribution/utils/getAuecPerSilc";
import { getTotalSilc } from "@/modules/profit-distribution/utils/getTotalSilc";

interface Payload {
  cycleId: string;
  changes: Change[];
}

const handler = async (payload: Payload) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `profitDistributionCycle;read` permission

  if (!(await isNovuEnabled())) return;

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

const event = {
  key: "profit_distribution_payout_disbursed",
  handler,
} as const;

export default event;
