import type { EventApplication, Prisma } from "@sam-monorepo/database/client";
import { EventApplicationStatus } from "@sam-monorepo/domain";

/** An application without a result. The unique index permits one per citizen and event. */
export const OPEN_APPLICATION_WHERE = {
  approvedAt: null,
  declinedAt: null,
  withdrawnAt: null,
} as const satisfies Prisma.EventApplicationWhereInput;

/** A CHECK constraint permits at most one result */
export const toEventApplicationStatus = (
  application: Pick<
    EventApplication,
    "approvedAt" | "declinedAt" | "withdrawnAt"
  >,
): EventApplicationStatus => {
  if (application.approvedAt) return EventApplicationStatus.Approved;
  if (application.declinedAt) return EventApplicationStatus.Declined;
  if (application.withdrawnAt) return EventApplicationStatus.Withdrawn;
  return EventApplicationStatus.Open;
};
