import { prisma } from "@sam-monorepo/database";
import { novu, publishNovuNotifications } from "../novu";

interface Payload {
  cycleId: string;
}

export const ProfitDistributionPayoutStartedHandler = async (
  payload: Payload,
) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `profitDistributionCycle;read` permission

  if (!novu) return;

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
  await publishNovuNotifications(
    cycle.participants.map((participant) => ({
      to: {
        subscriberId: participant.citizenId,
      },
      workflowId: "si-ncome-payout-started",
      payload: {
        id: cycle.id,
        title: cycle.title,
      },
    })),
  );
};
