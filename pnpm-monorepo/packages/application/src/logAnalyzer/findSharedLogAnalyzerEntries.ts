import type { Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import {
  requireLogAnalyzerAccess,
  type LogAnalyzerSharingOptions,
} from "./logAnalyzerAccess.js";
import { getEventAtWindow } from "./logAnalyzerWindow.js";

/**
 * The upper limit of one response. A viewer who joins late gets the entries
 * which were shared last, then the cursor keeps them up to date.
 */
export const MAXIMUM_SHARED_ENTRIES_PER_REQUEST = 500;

export const SHARED_ENTRY_SELECT = {
  id: true,
  type: true,
  rawLine: true,
  eventAt: true,
  createdBy: {
    select: CITIZEN_REFERENCE_SELECT,
  },
} as const;

export interface FindSharedLogAnalyzerEntriesInput {
  /** 0 loads without a time limit, as the local parsing does. */
  readonly daysToLoad: number;
  /** The newest entry the client holds. Absent for the first request. */
  readonly cursorId?: string | undefined;
}

export interface SharedLogAnalyzerEntry {
  readonly id: string;
  /**
   * The database keeps the type as text: a value can lack a pattern after a
   * pattern was removed. See `toLogAnalyzerEntryType`.
   */
  readonly type: string;
  readonly rawLine: string;
  readonly eventAt: Date;
  /** Null after the citizen was deleted */
  readonly createdBy: CitizenReferenceRow | null;
}

export interface SharedLogAnalyzerEntries {
  readonly entries: SharedLogAnalyzerEntry[];
  /** Null keeps the cursor the client already has */
  readonly cursorId: string | null;
}

/**
 * The log entries other citizens shared. The cursor moves along the creation
 * time and not along the event time, because a citizen who shares their
 * history for the first time adds old events with a new creation time.
 */
export const findSharedLogAnalyzerEntries = async (
  context: ApplicationContext,
  actor: Actor,
  input: FindSharedLogAnalyzerEntriesInput,
  options: LogAnalyzerSharingOptions,
): Promise<SharedLogAnalyzerEntries> => {
  requireLogAnalyzerAccess(actor, options);

  const isIncremental = Boolean(input.cursorId);
  const direction = isIncremental ? "asc" : "desc";

  const entries = await context.prisma.logAnalyzerEntry.findMany({
    where: { eventAt: getEventAtWindow(input.daysToLoad, context.now()) },
    /**
     * The id breaks the tie of two entries of the same moment, so the cursor
     * cannot step over one of them.
     */
    orderBy: [{ createdAt: direction }, { id: direction }],
    ...(input.cursorId
      ? { cursor: { id: input.cursorId }, skip: 1 }
      : undefined),
    take: MAXIMUM_SHARED_ENTRIES_PER_REQUEST,
    select: SHARED_ENTRY_SELECT,
  });

  /**
   * The newest entry of this response, which the next request continues from.
   * Null keeps the cursor the client already has.
   */
  const cursorId =
    (isIncremental ? entries.at(-1)?.id : entries.at(0)?.id) ?? null;

  return { entries, cursorId };
};
