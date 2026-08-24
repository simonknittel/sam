import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { type Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getLastSeenAt = cache(
  async (entity: Pick<Entity, "discordId">) => {
    const authentication = await requireAuthentication();

    if (
      !(await authentication.authorize("lastSeen", "read")) ||
      !entity.discordId
    )
      return undefined;

    const account = await prisma.account.findFirst({
      where: {
        provider: "discord",
        providerAccountId: entity.discordId,
      },
      select: {
        user: {
          select: {
            lastSeenAt: true,
          },
        },
      },
    });

    return account?.user.lastSeenAt;
  },
);
