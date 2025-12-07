import { prisma } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push";

interface Payload {
  cycleId: string;
}

export const ProfitDistributionPayoutStartedHandler = async (
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
      participants: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (!cycle || cycle.participants.length === 0) return;

  /**
   * Publish notifications
   */
  await publishWebPushNotifications(
    cycle.participants.map((participant) => ({
      receiverId: participant.citizenId,
      notificationType: "sincome_payout_started",
      title: "SINcome-Auszahlung gestartet",
      body: `Die Auszahlungsphase für den Zeitraum ${cycle.title} wurde gestartet. Bitte stimme der Auszahlung zu.`,
      url: `/app/sincome/${cycle.id}`,
    })),
  );
};
