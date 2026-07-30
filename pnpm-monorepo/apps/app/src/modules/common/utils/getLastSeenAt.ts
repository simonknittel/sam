import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  type Account,
  type Entity,
  type User,
} from "@sam-monorepo/database/client";
import { cache } from "react";

export const getLastSeenAt = cache(async (entity: Entity) => {
  const authentication = await requireAuthentication();

  let account: (Account & { user: User }) | null = null;

  if (
    (await authentication.authorize("lastSeen", "read")) &&
    entity.discordId
  ) {
    account = await prisma.account.findFirst({
      where: {
        provider: "discord",
        providerAccountId: entity.discordId,
      },
      include: {
        user: true,
      },
    });
  }

  return account?.user.lastSeenAt;
});
