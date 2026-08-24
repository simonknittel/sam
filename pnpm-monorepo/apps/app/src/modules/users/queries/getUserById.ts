import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { User } from "@sam-monorepo/database/client";

export const getUserById = withTrace("getUserById", async (id: User["id"]) => {
  /** The sign-in callback only checks whether the user exists and is banned */
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      bannedAt: true,
    },
  });
});
