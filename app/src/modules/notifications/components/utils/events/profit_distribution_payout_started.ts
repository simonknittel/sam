import { prisma } from "@/db";
import { isNovuEnabled, novu } from "@/modules/novu/utils";

interface Payload {
  cycleId: string;
}

const handler = async (payload: Payload) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `profitDistributionCycle;read` permission

  if (!(await isNovuEnabled())) return;

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

  // Split participants into chunks of 100 to avoid limit of Novu SDK/API
  const chunks = [];
  const chunkSize = 100;
  for (let i = 0; i < cycle.participants.length; i += chunkSize) {
    chunks.push(cycle.participants.slice(i, i + chunkSize));
  }

  // Send notifications in bulk for each chunk
  for (const chunk of chunks) {
    await novu?.triggerBulk({
      events: chunk.map((participant) => ({
        to: {
          subscriberId: participant.citizenId,
        },
        workflowId: "si-ncome-payout-started",
        payload: {
          id: cycle.id,
          title: cycle.title,
        },
      })),
    });
  }
};

const event = {
  key: "profit_distribution_payout_started",
  handler,
} as const;

export default event;
