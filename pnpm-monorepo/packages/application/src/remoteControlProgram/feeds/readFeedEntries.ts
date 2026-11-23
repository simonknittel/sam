import type { Prisma } from "@sam-monorepo/database/client";
import { CapabilityId, type EffectiveReadAccess } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import { loadReadAccessOfViewer } from "../access/loadReadAccess.js";
import { requireGrantedReadAccess } from "../access/requireGrantedReadAccess.js";
import {
  compareFeedEntryPositions,
  encodeFeedEntryPosition,
  feedEntryPositionSchema,
  type FeedEntryPosition,
} from "./feedEntryPosition.js";
import {
  FEED_LOG_ENTRY_SELECT,
  toFeedLogEntry,
  type FeedLogEntry,
} from "./feedLogEntry.js";

/**
 * The upper limit of one read, the same as for the shared entries of the old
 * Log Analyzer. 500 raw lines of a maximum of 1,000 characters keep a
 * response below 1 MB.
 */
export const MAXIMUM_FEED_ENTRIES_PER_READ = 500;

/**
 * The cursor of the changes stays this time behind the time of the read.
 * Two uploads can commit in a different order than the order of their
 * arrival times, and a read does not see an upload before its commit. Thus
 * a cursor directly after the newest entry could skip an entry that commits
 * later with an older arrival time. The time is far above the time between
 * the arrival and the commit (milliseconds, and the wait for a connection of
 * the database) and above a normal difference of the clocks of the relay
 * service and the app. The next read gives the entries of this time again,
 * and the consumer client removes the duplicates with the hash.
 */
const CURSOR_SETTLE_MILLISECONDS = 10_000;

export enum FeedEntryReadMode {
  /**
   * The entries of a time window, newest first (`eventAt`), one page after
   * the other. A control UI reads it when it opens.
   */
  Snapshot = "snapshot",
  /**
   * The entries that arrived after a cursor, oldest first (`createdAt`). A
   * control UI reads it after a reconnect of the realtime service.
   */
  Changes = "changes",
}

/** The time window of the observation (`eventAt`) */
const timeWindowShape = {
  /**
   * Without it: no limit. The Log Analyzer gives
   * `getLogAnalyzerWindowStart()` of its days to load (see
   * `clampLogAnalyzerDaysToLoad()`), or the start of its date range.
   */
  start: z.date().optional(),
  /** Exclusive. Without it: no limit. */
  end: z.date().optional(),
};

export const readFeedEntriesInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal(FeedEntryReadMode.Snapshot),
    ...timeWindowShape,
    /** The `nextPageCursor` of the previous page. Absent for the first page. */
    page_cursor: feedEntryPositionSchema.optional(),
  }),
  z.object({
    mode: z.literal(FeedEntryReadMode.Changes),
    ...timeWindowShape,
    /** The `cursor` of the previous read */
    cursor: feedEntryPositionSchema,
  }),
]);

export type ReadFeedEntriesInput = z.output<typeof readFeedEntriesInputSchema>;

export interface ReadFeedEntriesOutput {
  readonly entries: FeedLogEntry[];
  /**
   * The cursor of the next read of the changes. Of a snapshot with more than
   * one page, keep the cursor of the first page.
   */
  readonly cursor: string;
  /**
   * The read stopped at `MAXIMUM_FEED_ENTRIES_PER_READ` entries, and there
   * are more entries: read the next page of a snapshot with
   * `nextPageCursor`, or the changes again with `cursor`
   */
  readonly hasMore: boolean;
  /** Only for a snapshot with more entries */
  readonly nextPageCursor: string | null;
}

const FEED_LOG_ENTRY_WITH_OWNER_SELECT = {
  ...FEED_LOG_ENTRY_SELECT,
  createdBy: { select: { id: true, handle: true } },
} as const satisfies Prisma.LogAnalyzerEntrySelect;

type FeedLogEntryWithOwnerRow = Prisma.LogAnalyzerEntryGetPayload<{
  select: typeof FEED_LOG_ENTRY_WITH_OWNER_SELECT;
}>;

interface TimeWindow {
  readonly start?: Date | undefined;
  readonly end?: Date | undefined;
}

/** Null is no limit */
const getLaterStart = (first: Date | null, second: Date | null) => {
  if (first === null) return second;
  if (second === null) return first;
  return first > second ? first : second;
};

/** Null is no limit */
const getEarlierEnd = (first: Date | null, second: Date | null) => {
  if (first === null) return second;
  if (second === null) return first;
  return first < second ? first : second;
};

/**
 * One filter for each owner with access: the entries of the owner in the
 * intersection of the visible time range (decision 8) and the time window
 */
const createVisibleEntryFilters = (
  accessByOwnerCitizenId: ReadonlyMap<string, EffectiveReadAccess>,
  window: TimeWindow,
): Prisma.LogAnalyzerEntryWhereInput[] =>
  Array.from(accessByOwnerCitizenId).flatMap(([ownerCitizenId, access]) => {
    if (!access.isGranted) return [];

    const start = getLaterStart(
      access.visibleTimeRange.start,
      window.start ?? null,
    );
    const end = getEarlierEnd(access.visibleTimeRange.end, window.end ?? null);
    if (start !== null && end !== null && start >= end) return [];

    return [
      {
        createdById: ownerCitizenId,
        eventAt: { gte: start ?? undefined, lt: end ?? undefined },
      },
    ];
  });

/** The rows of the owners always have an owner: the filters name the owners */
const toFeedLogEntries = (rows: readonly FeedLogEntryWithOwnerRow[]) =>
  rows.flatMap((row) =>
    row.createdBy
      ? [
          toFeedLogEntry(row, {
            id: row.createdBy.id,
            handle: row.createdBy.handle,
          }),
        ]
      : [],
  );

const getSettledPosition = (now: Date): FeedEntryPosition => ({
  time: new Date(now.getTime() - CURSOR_SETTLE_MILLISECONDS),
  id: "",
});

const readSnapshot = async (
  context: ApplicationContext,
  visibleEntryFilters: Prisma.LogAnalyzerEntryWhereInput[],
  pageCursor: FeedEntryPosition | undefined,
  now: Date,
): Promise<ReadFeedEntriesOutput> => {
  const cursor = encodeFeedEntryPosition(getSettledPosition(now));
  if (visibleEntryFilters.length === 0)
    return { entries: [], cursor, hasMore: false, nextPageCursor: null };

  const rows = await context.prisma.logAnalyzerEntry.findMany({
    where: {
      AND: [
        { OR: visibleEntryFilters },
        pageCursor
          ? {
              OR: [
                { eventAt: { lt: pageCursor.time } },
                { eventAt: pageCursor.time, id: { lt: pageCursor.id } },
              ],
            }
          : {},
      ],
    },
    // The id breaks the tie of two entries of the same moment
    orderBy: [{ eventAt: "desc" }, { id: "desc" }],
    take: MAXIMUM_FEED_ENTRIES_PER_READ + 1,
    select: FEED_LOG_ENTRY_WITH_OWNER_SELECT,
  });

  const hasMore = rows.length > MAXIMUM_FEED_ENTRIES_PER_READ;
  const pageRows = rows.slice(0, MAXIMUM_FEED_ENTRIES_PER_READ);
  const lastRow = pageRows.at(-1);

  return {
    entries: toFeedLogEntries(pageRows),
    cursor,
    hasMore,
    nextPageCursor:
      hasMore && lastRow
        ? encodeFeedEntryPosition({ time: lastRow.eventAt, id: lastRow.id })
        : null,
  };
};

/**
 * The cursor after a read of the changes. A full read continues after its
 * last entry. Else the cursor does not go past the settled position (see
 * `CURSOR_SETTLE_MILLISECONDS`), and never back.
 */
const getNextChangesPosition = (
  cursor: FeedEntryPosition,
  lastPosition: FeedEntryPosition | null,
  hasMore: boolean,
  now: Date,
) => {
  if (lastPosition === null) return cursor;
  if (hasMore) return lastPosition;

  const settledPosition = getSettledPosition(now);
  const nextPosition =
    compareFeedEntryPositions(lastPosition, settledPosition) < 0
      ? lastPosition
      : settledPosition;

  return compareFeedEntryPositions(nextPosition, cursor) > 0
    ? nextPosition
    : cursor;
};

const readChanges = async (
  context: ApplicationContext,
  visibleEntryFilters: Prisma.LogAnalyzerEntryWhereInput[],
  cursor: FeedEntryPosition,
  now: Date,
): Promise<ReadFeedEntriesOutput> => {
  if (visibleEntryFilters.length === 0)
    return {
      entries: [],
      cursor: encodeFeedEntryPosition(cursor),
      hasMore: false,
      nextPageCursor: null,
    };

  const rows = await context.prisma.logAnalyzerEntry.findMany({
    where: {
      AND: [
        { OR: visibleEntryFilters },
        {
          OR: [
            { createdAt: { gt: cursor.time } },
            { createdAt: cursor.time, id: { gt: cursor.id } },
          ],
        },
      ],
    },
    // The id breaks the tie of the entries of one batch
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAXIMUM_FEED_ENTRIES_PER_READ + 1,
    select: FEED_LOG_ENTRY_WITH_OWNER_SELECT,
  });

  const hasMore = rows.length > MAXIMUM_FEED_ENTRIES_PER_READ;
  const pageRows = rows.slice(0, MAXIMUM_FEED_ENTRIES_PER_READ);
  const lastRow = pageRows.at(-1);

  return {
    entries: toFeedLogEntries(pageRows),
    cursor: encodeFeedEntryPosition(
      getNextChangesPosition(
        cursor,
        lastRow ? { time: lastRow.createdAt, id: lastRow.id } : null,
        hasMore,
        now,
      ),
    ),
    hasMore,
    nextPageCursor: null,
  };
};

/**
 * Reads the entries of `log_entries` that the actor (the viewer) can read:
 * the own entries, and the entries of each owner with a valid grant for the
 * viewer, only in the visible time range of the grants (decision 8). The
 * access is loaded again for each read (principle 5). The Log Analyzer
 * reads a snapshot when it opens, and the changes since its cursor after a
 * reconnect of the realtime service. Each read gives a maximum of
 * `MAXIMUM_FEED_ENTRIES_PER_READ` entries and tells when there are more.
 *
 * A read of the changes can give an entry again (see
 * `CURSOR_SETTLE_MILLISECONDS`). A new grant does not add the older entries
 * of its owner to the changes: the control UI reads a new snapshot for them.
 *
 * @throws ForbiddenError without a citizen, without `remoteControlProgram;use`
 * or `logAnalyzer;read`, or when a switch turned off the Remote Control
 * Program or the capability (the message of `RemoteControlProgramErrorMessage`)
 */
export const readFeedEntries = (
  context: ApplicationContext,
  actor: Actor,
  input: ReadFeedEntriesInput,
): Promise<ReadFeedEntriesOutput> =>
  withSpan(context, "readFeedEntries", async () => {
    const { viewer, accessByOwnerCitizenId } = await loadReadAccessOfViewer(
      context,
      actor,
      { capabilityId: CapabilityId.LogEntries },
    );
    /**
     * Without a list of owners, the loader also gives the access of the
     * viewer to the own entries. It needs no grant, thus its refusal is a
     * switch or a permission, which applies to all owners.
     */
    const ownAccess = accessByOwnerCitizenId.get(viewer.citizenId);
    if (ownAccess) requireGrantedReadAccess(ownAccess);

    const now = context.now();
    const visibleEntryFilters = createVisibleEntryFilters(
      accessByOwnerCitizenId,
      input,
    );

    switch (input.mode) {
      case FeedEntryReadMode.Snapshot:
        return readSnapshot(
          context,
          visibleEntryFilters,
          input.page_cursor,
          now,
        );

      case FeedEntryReadMode.Changes:
        return readChanges(context, visibleEntryFilters, input.cursor, now);

      default:
        throw new Error(
          `Unknown read mode: ${JSON.stringify(input satisfies never)}`,
        );
    }
  });
