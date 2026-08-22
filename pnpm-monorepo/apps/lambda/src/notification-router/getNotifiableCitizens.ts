import { prisma } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";
import { NOTIFIABLE_CITIZEN_WHERE } from "@sam-monorepo/domain";

/**
 * Citizens matching the given filter who are reachable for event
 * notifications, see `NOTIFIABLE_CITIZEN_WHERE`.
 */
export const getNotifiableCitizens = (where: Prisma.EntityWhereInput) =>
  prisma.entity.findMany({
    where: {
      AND: [where, NOTIFIABLE_CITIZEN_WHERE],
    },
    select: {
      id: true,
    },
  });
