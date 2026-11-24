import {
  CYCLE_PHASE_WHERE,
  CyclePhase,
  getCurrentPhase,
  type PayoutState,
} from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { getOwnSilcBalance } from "../silc/silcBalances.js";
import { withSpan } from "../withSpan.js";
import { CYCLE_EXCERPT_SELECT, type CycleExcerptRow } from "./cycleSelects.js";
import { getOwnCycleView } from "./ownCycleView.js";

export enum ProfitDistributionCycleListStatus {
  /** The cycles before the end of their payout */
  Open = "open",
  Completed = "completed",
}

interface Input {
  readonly status: ProfitDistributionCycleListStatus;
}

export interface ProfitDistributionCycleExcerpt {
  // TODO: Remove cycle.participants if the user doesn't have the manage permission
  readonly cycle: CycleExcerptRow;
  readonly currentPhase: CyclePhase;
  readonly myParticipant: CycleExcerptRow["participants"][number] | undefined;
  /** The current balance in the collection phase, else the snapshot */
  readonly mySilcBalance: number;
  /** 0 until the payout starts */
  readonly myShare: number;
  readonly myPayoutState: PayoutState;
}

type CyclePhaseRow = Parameters<typeof getCurrentPhase>[0];

const isVisibleOpenCycle = (
  cycle: CyclePhaseRow,
  isFirstCollectionCycle: boolean,
) => {
  const phase = getCurrentPhase(cycle);
  switch (phase) {
    case CyclePhase.Collection:
      return isFirstCollectionCycle;

    case CyclePhase.PayoutPreparation:
    case CyclePhase.Payout:
      return true;

    case CyclePhase.Completed:
      return false;

    default:
      throw new Error(`Unknown cycle phase: ${phase satisfies never}`);
  }
};

/**
 * `openCycles` are the cycles that are not completed, the latest planned end of
 * the collection phase first. The list of the cycles and the calendar use this
 * rule.
 */
export const filterVisibleOpenCycles = <Cycle extends CyclePhaseRow>(
  openCycles: readonly Cycle[],
  isManager: boolean,
): Cycle[] => {
  if (isManager) return [...openCycles];

  const firstCollectionCycle = openCycles.find(
    (cycle) => getCurrentPhase(cycle) === CyclePhase.Collection,
  );

  return openCycles.filter((cycle) =>
    isVisibleOpenCycle(cycle, cycle === firstCollectionCycle),
  );
};

/**
 * Also requires `silcBalanceOfCurrentCitizen;read` when the list has a cycle in
 * the collection phase
 */
export const findProfitDistributionCycleExcerpts = (
  context: ApplicationContext,
  actor: Actor,
  { status }: Input,
): Promise<ProfitDistributionCycleExcerpt[]> =>
  withSpan(context, "findProfitDistributionCycleExcerpts", async () => {
    requirePermission(actor, "profitDistributionCycle", "read");
    const isManager = actor.authorize("profitDistributionCycle", "manage");

    const completedWhere = CYCLE_PHASE_WHERE[CyclePhase.Completed];
    const cycles = await context.prisma.profitDistributionCycle.findMany({
      where:
        status === ProfitDistributionCycleListStatus.Open
          ? { NOT: completedWhere }
          : completedWhere,
      orderBy: { collectionEndsAt: "desc" },
      select: CYCLE_EXCERPT_SELECT,
    });

    const visibleCycles =
      status === ProfitDistributionCycleListStatus.Open
        ? filterVisibleOpenCycles(cycles, isManager)
        : cycles;

    const ownSilcBalance = visibleCycles.some(
      (cycle) => getCurrentPhase(cycle) === CyclePhase.Collection,
    )
      ? await getOwnSilcBalance(context, actor)
      : 0;

    return visibleCycles.map((cycle) => {
      const {
        currentPhase,
        myParticipant,
        mySilcBalance,
        auecPerSilc,
        myPayoutState,
      } = getOwnCycleView(cycle, actor, ownSilcBalance);

      return {
        cycle,
        currentPhase,
        myParticipant,
        mySilcBalance,
        myShare: mySilcBalance * (auecPerSilc ?? 0),
        myPayoutState,
      };
    });
  });
