import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getGameVersions = cache(
  withTrace("getGameVersions", async () => {
    const gameVersions = await prisma.gameVersion.findMany({
      orderBy: [{ channel: "asc" }, { version: "desc" }],
      select: {
        id: true,
        version: true,
        channel: true,
      },
    });

    return {
      all: gameVersions,
      default:
        gameVersions.find(
          (gameVersion) =>
            gameVersion.channel === "LIVE" && gameVersion.version === "4.8.0",
        )?.id ?? null,
    };
  }),
);
