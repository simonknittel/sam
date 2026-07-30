import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { User } from "@sam-monorepo/database/client";

export const getUserById = withTrace("getUserById", async (id: User["id"]) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
});
