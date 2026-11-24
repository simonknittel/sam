import {
  CyclePhase,
  getCurrentPhase,
  getTotalSilc,
  type PayoutState,
} from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  findSilcBalanceRows,
  getOwnSilcBalance,
  type SilcBalanceRow,
} from "../silc/silcBalances.js";
import { withSpan } from "../withSpan.js";
import { getOpenAuecPayout, getPaidAuec } from "./cycleAmounts.js";
import { CYCLE_DETAILS_SELECT, type CycleDetailsRow } from "./cycleSelects.js";
import { getOwnCycleView } from "./ownCycleView.js";

/** A cycle with the numbers of its page, from the view of the actor */
export interface ProfitDistributionCycleDetails {
  readonly cycle: CycleDetailsRow;
  readonly currentPhase: CyclePhase;
  readonly myParticipant: CycleDetailsRow["participants"][number] | undefined;
  /** The current balance in the collection phase, else the snapshot */
  readonly mySilcBalance: number;
  /** Null until the payout starts */
  readonly myShare: number | null;
  readonly myPayoutState: PayoutState;
  /**
   * The citizens with a positive balance, only for a manager. The other
   * actors get an empty list.
   */
  readonly allSilcBalances: SilcBalanceRow[];
  readonly totalSilc: number;
  /** Null until the payout starts */
  readonly openAuecPayout: number | null;
  /** Null until the payout starts */
  readonly paidAuec: number | null;
  /** Null until the payout starts */
  readonly auecPerSilc: number | null;
}

/**
 * The cycle of the page and of the management page. Requires
 * `profitDistributionCycle;read`. In the collection phase it also requires
 * `silcBalanceOfCurrentCitizen;read`. For a manager
 * (`profitDistributionCycle;manage`), it requires
 * `silcBalanceOfOtherCitizen;read` in each phase.
 *
 * @returns null when the cycle does not exist
 */
export const findProfitDistributionCycleDetails = (
  context: ApplicationContext,
  actor: Actor,
  cycleId: string,
): Promise<ProfitDistributionCycleDetails | null> =>
  withSpan(context, "findProfitDistributionCycleDetails", async () => {
    requirePermission(actor, "profitDistributionCycle", "read");
    const isManager = actor.authorize("profitDistributionCycle", "manage");

    const cycle = await context.prisma.profitDistributionCycle.findUnique({
      where: { id: cycleId },
      select: CYCLE_DETAILS_SELECT,
    });
    if (!cycle) return null;

    const ownSilcBalance =
      getCurrentPhase(cycle) === CyclePhase.Collection
        ? await getOwnSilcBalance(context, actor)
        : 0;
    const ownCycleView = getOwnCycleView(cycle, actor, ownSilcBalance);
    const { mySilcBalance, auecPerSilc } = ownCycleView;
    const allSilcBalances = isManager
      ? (await findSilcBalanceRows(context, actor)).filter(
          (citizen) => citizen.silcBalance > 0,
        )
      : [];

    return {
      cycle,
      ...ownCycleView,
      myShare: auecPerSilc !== null ? mySilcBalance * auecPerSilc : null,
      allSilcBalances,
      totalSilc: getTotalSilc(cycle.participants),
      openAuecPayout:
        auecPerSilc !== null
          ? getOpenAuecPayout(cycle.participants, auecPerSilc)
          : null,
      paidAuec:
        auecPerSilc !== null
          ? getPaidAuec(cycle.participants, auecPerSilc)
          : null,
    };
  });
