import {
  CalendarEntryType,
  CyclePhase,
  getCurrentPhase,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { CYCLE_PHASE_SELECT } from "../profitDistribution/cycleSelects.js";
import { filterVisibleOpenCycles } from "../profitDistribution/findProfitDistributionCycleExcerpts.js";
import {
  ProfitDistributionPhaseEnd,
  type CalendarEntryCollector,
  type CalendarQuery,
  type ProfitDistributionCalendarEntry,
} from "./calendarEntry.js";

interface CycleOfEntry {
  readonly id: string;
  readonly title: string;
}

const toEntry = (
  cycle: CycleOfEntry,
  phaseEnd: ProfitDistributionPhaseEnd,
  time: Date | null,
  { from, until }: CalendarQuery,
): ProfitDistributionCalendarEntry[] => {
  if (!time || time < from || time >= until) return [];

  return [
    {
      type: CalendarEntryType.ProfitDistribution,
      key: `profit_distribution:${cycle.id}:${phaseEnd}`,
      date: getLocalDate(time, ORGANIZATION_TIMEZONE),
      time,
      href: `/app/sincome/${cycle.id}`,
      cycle: { id: cycle.id, title: cycle.title },
      phaseEnd,
    },
  ];
};

/**
 * The planned ends of the collection phase and of the payout phase of the
 * cycles that the actor sees in the lists of the cycles: all completed
 * cycles, and of the open cycles the ones of `filterVisibleOpenCycles`
 */
export const profitDistributionEntryCollector: CalendarEntryCollector<ProfitDistributionCalendarEntry> =
  {
    canRead: (actor) => actor.authorize("profitDistributionCycle", "read"),
    collect: async (context, actor, query) => {
      /**
       * The visibility of an open cycle depends on the other open cycles,
       * thus the query cannot filter by the range. There are only a few
       * cycles.
       */
      const cycles = await context.prisma.profitDistributionCycle.findMany({
        orderBy: { collectionEndsAt: "desc" },
        select: {
          ...CYCLE_PHASE_SELECT,
          id: true,
          title: true,
          collectionEndsAt: true,
          payoutEndsAt: true,
        },
      });

      const isCompleted = (cycle: (typeof cycles)[number]) =>
        getCurrentPhase(cycle) === CyclePhase.Completed;
      const visibleCycles = [
        ...cycles.filter(isCompleted),
        ...filterVisibleOpenCycles(
          cycles.filter((cycle) => !isCompleted(cycle)),
          actor.authorize("profitDistributionCycle", "manage"),
        ),
      ];

      return visibleCycles.flatMap((cycle) => [
        ...toEntry(
          cycle,
          ProfitDistributionPhaseEnd.Collection,
          cycle.collectionEndsAt,
          query,
        ),
        ...toEntry(
          cycle,
          ProfitDistributionPhaseEnd.Payout,
          cycle.payoutEndsAt,
          query,
        ),
      ]);
    },
  };
