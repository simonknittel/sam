import type {
  Prisma,
  ProfitDistributionCycle,
} from "@sam-monorepo/database/client";

/** The phases of a profit distribution cycle, in their order */
export enum CyclePhase {
  Collection,
  PayoutPreparation,
  Payout,
  Completed,
}

/**
 * Gets the phase of a cycle from its actual dates only: each phase lasts
 * until its actual end is set. The planned ends (`collectionEndsAt`,
 * `payoutEndsAt`) are only for display and for the midnight jobs, which set
 * the actual ends when they are due.
 */
export const getCurrentPhase = (
  cycle: Pick<
    ProfitDistributionCycle,
    "collectionEndedAt" | "payoutStartedAt" | "payoutEndedAt"
  >,
) => {
  if (cycle.collectionEndedAt === null) return CyclePhase.Collection;
  if (cycle.payoutStartedAt === null) return CyclePhase.PayoutPreparation;
  if (cycle.payoutEndedAt === null) return CyclePhase.Payout;
  return CyclePhase.Completed;
};

/**
 * The rule of `getCurrentPhase()` as a database filter. Use it to find the
 * cycles of a phase and to claim a cycle with a guarded update. The CHECK
 * `ProfitDistributionCycle_phase_order_check` makes sure that a later actual
 * date is only set after the earlier ones.
 */
export const CYCLE_PHASE_WHERE = {
  [CyclePhase.Collection]: { collectionEndedAt: null },
  [CyclePhase.PayoutPreparation]: {
    collectionEndedAt: { not: null },
    payoutStartedAt: null,
  },
  [CyclePhase.Payout]: {
    payoutStartedAt: { not: null },
    payoutEndedAt: null,
  },
  [CyclePhase.Completed]: { payoutEndedAt: { not: null } },
} as const satisfies Record<
  CyclePhase,
  Prisma.ProfitDistributionCycleWhereInput
>;
