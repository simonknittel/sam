import { prisma } from "@sam-monorepo/database";
import { getAuecPerSilc } from "../../../common/profit-distribution/utils/getAuecPerSilc";
import { getTotalSilc } from "../../../common/profit-distribution/utils/getTotalSilc";
import { publishWebPushNotifications } from "../web-push";

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
  payload: Payload,
) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `profitDistributionCycle;read` permission

  const cycle = await prisma.profitDistributionCycle.findUnique({
    where: {
      id: payload.cycleId,
    },
    select: {
      id: true,
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
   * Publish notifications
   */
  await publishWebPushNotifications(
    participantsWithDisbursedEnabled.map((participant) => {
      const aUEC =
        (participant.silcBalanceSnapshot || 0) *
        getAuecPerSilc(cycle.auecProfit || 0, getTotalSilc(cycle.participants));

      return {
        receiverId: participant.citizenId,
        notificationType: "sincome_payout_disbursed",
        title: "SINcome-Auszahlung erhalten",
        body: `Für den Zeitraum ${cycle.title} hast du eine Auszahlung in Höhe von ${aUEC.toLocaleString("de-DE")} aUEC erhalten.`,
        url: `/app/sincome/${cycle.id}`,
      };
    }),
  );
};
