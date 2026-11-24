import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  CYCLE_PHASE_WHERE,
  CyclePhase,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

interface Options {
  /** The function adds the filter of the payout phase */
  readonly where: Prisma.ProfitDistributionCycleWhereInput;
  /** The citizen who ends the payout, null for the midnight job */
  readonly endedById: string | null;
  /** The user of the audit events, null for the midnight job */
  readonly createdById: string | null;
}

/**
 * The guarded update selects and claims the cycles in one statement, thus a
 * payout that a manager or an earlier run ended stays as it is
 */
export const endPayoutOfCycles = async (
  context: ApplicationContext,
  { where, endedById, createdById }: Options,
): Promise<string[]> => {
  const cycles =
    await context.prisma.profitDistributionCycle.updateManyAndReturn({
      where: { ...where, ...CYCLE_PHASE_WHERE[CyclePhase.Payout] },
      data: { payoutEndedAt: context.now(), payoutEndedById: endedById },
      select: { id: true },
    });
  if (cycles.length === 0) return [];

  await context.audit.create(
    cycles.map((cycle) => ({
      type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
      data: { cycleId: cycle.id },
      createdById,
    })),
  );

  return cycles.map((cycle) => cycle.id);
};
