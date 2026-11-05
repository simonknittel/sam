import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  MAXIMUM_SHARED_ENTRIES_PER_REQUEST,
  SHARED_ENTRY_SELECT,
  type SharedLogAnalyzerEntry,
} from "./findSharedLogAnalyzerEntries.js";
import {
  requireLogAnalyzerAccess,
  type LogAnalyzerSharingOptions,
} from "./logAnalyzerAccess.js";

export interface FindSharedLogAnalyzerEntriesInRangeInput {
  readonly from?: Date | undefined;
  /** Exclusive */
  readonly to?: Date | undefined;
  /** The last entry of the previous page. Absent for the first request. */
  readonly cursorId?: string | undefined;
}

export interface SharedLogAnalyzerEntriesInRange {
  readonly entries: SharedLogAnalyzerEntry[];
  /** Null ends the paging */
  readonly nextCursorId: string | null;
}

/**
 * The log entries of a date range, one page after the other. The polling of
 * `findSharedLogAnalyzerEntries` follows the creation time and gives only the
 * entries which were shared last. A range has to reach old events, thus the
 * cursor here moves along the time of the event.
 */
export const findSharedLogAnalyzerEntriesInRange = async (
  context: ApplicationContext,
  actor: Actor,
  input: FindSharedLogAnalyzerEntriesInRangeInput,
  options: LogAnalyzerSharingOptions,
): Promise<SharedLogAnalyzerEntriesInRange> => {
  requireLogAnalyzerAccess(actor, options);

  const entries = await context.prisma.logAnalyzerEntry.findMany({
    where: { eventAt: { gte: input.from, lt: input.to } },
    /** The id breaks the tie of two entries of the same moment */
    orderBy: [{ eventAt: "desc" }, { id: "desc" }],
    ...(input.cursorId
      ? { cursor: { id: input.cursorId }, skip: 1 }
      : undefined),
    take: MAXIMUM_SHARED_ENTRIES_PER_REQUEST,
    select: SHARED_ENTRY_SELECT,
  });

  const isLastPage = entries.length < MAXIMUM_SHARED_ENTRIES_PER_REQUEST;

  return {
    entries,
    nextCursorId: isLastPage ? null : (entries.at(-1)?.id ?? null),
  };
};
