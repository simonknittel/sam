import { expect } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";

/**
 * The assertion polls: an action writes its audit event after its change, thus
 * a test that waited for the change can be faster than the event.
 */
export const expectAuditEvents = async (
  prisma: PrismaClient,
  types: readonly string[],
) => {
  await expect
    .poll(async () => {
      const written = await prisma.auditEvent.findMany({
        where: { type: { in: [...types] } },
        select: { type: true },
      });
      return [...new Set(written.map((event) => event.type))].toSorted();
    })
    .toEqual([...types].toSorted());
};
