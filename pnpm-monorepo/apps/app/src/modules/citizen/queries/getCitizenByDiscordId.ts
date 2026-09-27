import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getCitizenByDiscordId = cache(
  withTrace("getCitizenByDiscordId", async (discordId: string) => {
    /**
     * A deleted citizen keeps its Discord ID, and a new citizen can have the
     * same one. The citizen that is not deleted comes first.
     */
    return prisma.citizen.findFirst({
      where: {
        discordId, // TODO: Respect history
      },
      orderBy: { deletedAt: { sort: "asc", nulls: "first" } },
      select: {
        id: true,
        handle: true,
        deletedAt: true,
      },
    });
  }),
);
