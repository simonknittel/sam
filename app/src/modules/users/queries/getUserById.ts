import { prisma } from "@/db";
import type { User } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getUserById = withTrace("getUserById", async (id: User["id"]) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
});
