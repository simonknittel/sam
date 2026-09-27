import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { type Citizen } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getLastSeenAt = cache(async (userId: Citizen["userId"]) => {
  const authentication = await requireAuthentication();

  if (!(await authentication.authorize("lastSeen", "read")) || !userId)
    return undefined;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAt: true },
  });

  return user?.lastSeenAt;
});
