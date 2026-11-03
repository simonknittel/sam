import {
  addDaysToLocalDate,
  fromDateColumnValue,
  getStartOfLocalDay,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { endPayoutOfCycles } from "./payoutEnd.js";

export interface EndDuePayoutPhasesOutput {
  readonly endedCycleCount: number;
}

/**
 * The instant at which `endDuePayoutPhases()` ends a payout phase. The
 * planned end is the last day of the phase (see `toDateColumnValue()`), and
 * the midnight job ends the phase at the start of the next day in the time
 * zone of the organization.
 */
export const getPayoutPhaseEnd = (payoutEndsAt: Date): Date =>
  getStartOfLocalDay(
    addDaysToLocalDate(fromDateColumnValue(payoutEndsAt), 1),
    ORGANIZATION_TIMEZONE,
  );

/** Ends the payout phases whose planned end is due */
export const endDuePayoutPhases = (
  context: ApplicationContext,
): Promise<EndDuePayoutPhasesOutput> =>
  withSpan(context, "endDuePayoutPhases", async () => {
    const endedCycleIds = await endPayoutOfCycles(context, {
      where: { payoutEndsAt: { lte: context.now() } },
      endedById: null,
      createdById: null,
    });

    return { endedCycleCount: endedCycleIds.length };
  });
