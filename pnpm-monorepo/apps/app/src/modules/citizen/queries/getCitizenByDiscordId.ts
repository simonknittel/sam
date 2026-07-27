import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getCitizenByDiscordId = cache(
  withTrace("getCitizenByDiscordId", async (discordId: string) => {
    return prisma.entity.findUnique({
      where: {
        discordId, // TODO: Respect history
      },
    });
  }),
);
