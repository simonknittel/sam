import { expect } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";

/**
 * Asserts that every one of the given audit-event types was written. The
 * query filters by type instead of reading the whole table, so a test that
 * produces a lot of unrelated events stays cheap — and a failure names
 * exactly which expected type is missing.
 */
export const expectAuditEvents = async (
  prisma: PrismaClient,
  types: readonly string[],
) => {
  const written = await prisma.auditEvent.findMany({
    where: { type: { in: [...types] } },
    select: { type: true },
  });

  expect([...new Set(written.map((event) => event.type))].toSorted()).toEqual(
    [...types].toSorted(),
  );
};
