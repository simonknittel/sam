import { SpanStatusCode } from "@opentelemetry/api";
import {
  findWatchingViewers,
  withSpan,
  type ApplicationContext,
  type CitizenRealtimeEvent,
  type FeedLogEntry,
  type FindWatchingViewersInput,
  type RealtimeServer,
  type WatchingViewer,
} from "@sam-monorepo/application";
import {
  CapabilityId,
  CitizenRealtimeChannel,
  FEED_DELIVERY_EVENT_NAME,
  isInVisibleTimeRange,
  type FeedDeliveryEventPayload,
} from "@sam-monorepo/domain";
import { MILLISECONDS_PER_SECOND } from "../time.js";
import {
  createDeliveryMetrics,
  DeliveryStage,
  DroppedEntryReason,
  type DeliveryMetrics,
} from "./deliveryMetrics.js";
import {
  splitIntoEventBatches,
  type PreparedEntry,
  type WaitingEntry,
} from "./eventBatches.js";

/**
 * A maximum of one publication to each viewer in this interval (see
 * "Channels" of `docs/remote-control-program/README.md`)
 */
const FLUSH_INTERVAL_MILLISECONDS = 2_000;

/**
 * In the interval, one owner sends a maximum of approximately 7 batches of
 * 100 entries (one batch each second and the burst of
 * `RELAY_LIMITS.uploadBurstBatches`). The limit holds the bursts of some
 * owners at the same time, or the full rate of 10 owners. A viewer whose
 * publications fail does not keep more entries.
 */
const MAXIMUM_WAITING_ENTRIES_PER_VIEWER = 2_000;

/**
 * Bounds the memory of all queues. The viewers share the objects of the
 * entries. One entry needs a maximum of approximately 2.5 KB (1,000
 * characters of the raw line in UTF-16 and the other fields), thus the
 * queues need a maximum of approximately 25 MB.
 */
const MAXIMUM_WAITING_ENTRIES = 10_000;

/**
 * The access check is at the acceptance of the entries. An entry that waits
 * longer, for example after failed publications, goes away. Thus a revoked
 * grant stops the data within seconds (principle 5).
 */
const MAXIMUM_WAITING_MILLISECONDS = 10_000;

/**
 * Soketi limits only the data of an event. The margin also covers the
 * channel name (a maximum of 164 characters), the event name and the JSON
 * of the HTTP API, for a realtime server that counts them.
 */
const EVENT_ENVELOPE_MARGIN_BYTES = 1_024;

export interface FeedEntryDeliveryInput {
  readonly ownerCitizenId: string;
  readonly capabilityId: CapabilityId;
  /** The new entries of the owner (`newEntries` of `appendFeedEntries`) */
  readonly entries: readonly FeedLogEntry[];
}

export interface FeedEntryDelivery {
  /**
   * After `appendFeedEntries` accepted new entries of an owner. Does not
   * throw and does not wait. Does nothing after the start of `close()`.
   */
  readonly deliver: (input: FeedEntryDeliveryInput) => void;
  /**
   * The controlled close: waits for the running access checks, sends the
   * waiting entries, then stops the timers. Call it after the server stops
   * the uploads, and before the realtime client stops.
   */
  readonly close: () => Promise<void>;
}

export interface FeedEntryDeliveryOptions {
  readonly context: ApplicationContext;
  /**
   * The size limit of the realtime server for the data of one event, in
   * bytes (see `PUSHER_CHANNELS_MAXIMUM_EVENT_PAYLOAD_KILOBYTES` and
   * docs/setup-test-and-production.md#10-set-up-the-relay-service-of-the-remote-control-program)
   */
  readonly maximumEventPayloadBytes: number;
  /** For the tests. The default is the use case `findWatchingViewers`. */
  readonly findWatchingViewers?: (
    context: ApplicationContext,
    input: FindWatchingViewersInput,
  ) => Promise<readonly WatchingViewer[]>;
}

const compareWaitingEntries = (
  { entry: first }: WaitingEntry,
  { entry: second }: WaitingEntry,
) => {
  const timeDifference = first.createdAt.getTime() - second.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;
  if (first.id === second.id) return 0;
  return first.id < second.id ? -1 : 1;
};

/** The waiting entries and the timing of one viewer */
interface ViewerQueue {
  waitingEntries: WaitingEntry[];
  /**
   * The dropped entries that the next event tells the viewer. A queue with a
   * count stays until the next event, thus the number of queues has the
   * number of citizens as its limit.
   */
  droppedEntryCount: number;
  lastFlushStartedAt: number | null;
  /** The end of the interval after the last flush */
  timer: ReturnType<typeof setTimeout> | null;
  /** The running flush. It does not reject. */
  flush: Promise<void> | null;
}

/**
 * The realtime delivery of the new feed entries to the watching viewers (see
 * "Delivery to the consumers" of `docs/remote-control-program/README.md`). Each
 * `deliver` checks the access at once (`findWatchingViewers`, no cache) and
 * puts the visible entries into the queue of each viewer. A viewer gets a
 * maximum of one publication in the interval: the first entries of a quiet
 * viewer go out at once, the next entries at the end of the interval. A
 * publication sends one or more events of `FEED_DELIVERY_EVENT_NAME` to the
 * private channel of the Remote Control Program of the viewer, each below
 * the size limit.
 *
 * The state is in memory. The consumer client reads the changes since its
 * cursor after a reconnect of the realtime service and after an event with
 * dropped entries, thus a lost entry comes back.
 */
export const createFeedEntryDelivery = ({
  context,
  maximumEventPayloadBytes,
  findWatchingViewers: findViewers = findWatchingViewers,
}: FeedEntryDeliveryOptions): FeedEntryDelivery => {
  const { realtime } = context;
  if (realtime === null) {
    context.log.warn(
      "The realtime server is not configured. The relay service delivers no feed entries in realtime.",
    );
    return { deliver: () => undefined, close: async () => undefined };
  }

  return createActiveDelivery({
    context,
    realtime,
    metrics: createDeliveryMetrics(),
    maximumPayloadBytes: Math.max(
      0,
      maximumEventPayloadBytes - EVENT_ENVELOPE_MARGIN_BYTES,
    ),
    findViewers,
  });
};

interface ActiveDeliveryOptions {
  readonly context: ApplicationContext;
  readonly realtime: RealtimeServer;
  readonly metrics: DeliveryMetrics;
  readonly maximumPayloadBytes: number;
  readonly findViewers: NonNullable<
    FeedEntryDeliveryOptions["findWatchingViewers"]
  >;
}

const createActiveDelivery = ({
  context,
  realtime,
  metrics,
  maximumPayloadBytes,
  findViewers,
}: ActiveDeliveryOptions): FeedEntryDelivery => {
  const queues = new Map<string, ViewerQueue>();
  const pendingCollections = new Set<Promise<void>>();
  let waitingEntryCount = 0;
  let isClosing = false;
  let closing: Promise<void> | null = null;

  const dropOldestEntries = (
    queue: ViewerQueue,
    count: number,
    reason: DroppedEntryReason,
  ) => {
    queue.waitingEntries.splice(0, count);
    waitingEntryCount -= count;
    queue.droppedEntryCount += count;
    metrics.droppedEntries.add(count, { reason });
  };

  /** Call it after each addition to the waiting entries of the queue */
  const applyViewerLimit = (queue: ViewerQueue) => {
    const viewerExcess =
      queue.waitingEntries.length - MAXIMUM_WAITING_ENTRIES_PER_VIEWER;
    if (viewerExcess > 0)
      dropOldestEntries(queue, viewerExcess, DroppedEntryReason.ViewerLimit);
  };

  /** Drops the oldest entries of the largest queues */
  const applyTotalLimit = () => {
    while (waitingEntryCount > MAXIMUM_WAITING_ENTRIES) {
      let largestQueue: ViewerQueue | null = null;
      for (const queue of queues.values())
        if (
          !largestQueue ||
          queue.waitingEntries.length > largestQueue.waitingEntries.length
        )
          largestQueue = queue;
      if (!largestQueue) return;

      dropOldestEntries(
        largestQueue,
        Math.min(
          waitingEntryCount - MAXIMUM_WAITING_ENTRIES,
          largestQueue.waitingEntries.length,
        ),
        DroppedEntryReason.TotalLimit,
      );
    }
  };

  const recordPublication = (
    batches: readonly (readonly PreparedEntry[])[],
  ) => {
    const now = Date.now();
    for (const batch of batches) {
      const oldestAcceptedAt = Math.min(
        ...batch.map(({ waitingEntry }) => waitingEntry.acceptedAt),
      );
      metrics.delay.record((now - oldestAcceptedAt) / MILLISECONDS_PER_SECOND);
      metrics.deliveredEntries.add(batch.length);
    }
    metrics.deliveredEvents.add(batches.length);
  };

  const flush = (viewerCitizenId: string, queue: ViewerQueue) =>
    withSpan(context, "flushFeedEntryDelivery", async (span) => {
      const now = Date.now();
      queue.lastFlushStartedAt = now;

      // The order of the changes of `readFeedEntries`. The uploads of parallel runtimes and the entries of a failed publication can come in a different order.
      const takenEntries = queue.waitingEntries.sort(compareWaitingEntries);
      queue.waitingEntries = [];
      waitingEntryCount -= takenEntries.length;

      const freshEntries = takenEntries.filter(
        ({ acceptedAt }) => now - acceptedAt <= MAXIMUM_WAITING_MILLISECONDS,
      );
      const expiredEntryCount = takenEntries.length - freshEntries.length;
      if (expiredEntryCount > 0) {
        queue.droppedEntryCount += expiredEntryCount;
        metrics.droppedEntries.add(expiredEntryCount, {
          reason: DroppedEntryReason.Expired,
        });
      }

      const { batches, tooLargeEntries } = splitIntoEventBatches(
        freshEntries,
        maximumPayloadBytes,
      );
      if (tooLargeEntries.length > 0) {
        queue.droppedEntryCount += tooLargeEntries.length;
        metrics.droppedEntries.add(tooLargeEntries.length, {
          reason: DroppedEntryReason.TooLarge,
        });
      }

      const [firstBatch] = batches;
      if (!firstBatch) return;

      const droppedEntryCount = queue.droppedEntryCount;
      queue.droppedEntryCount = 0;

      const events = batches.map((batch, index): CitizenRealtimeEvent => ({
        channel: CitizenRealtimeChannel.RemoteControlProgram,
        citizenId: viewerCitizenId,
        name: FEED_DELIVERY_EVENT_NAME,
        data: {
          // In step 2, `log_entries` is the only feed, and `FeedLogEntry` is its entry
          capability_id: CapabilityId.LogEntries,
          entries: batch.map(({ deliveredEntry }) => deliveredEntry),
          dropped_entry_count: index === 0 ? droppedEntryCount : 0,
        } satisfies FeedDeliveryEventPayload,
      }));
      const sentEntryCount = batches.reduce(
        (count, batch) => count + batch.length,
        0,
      );
      span.setAttributes({
        "remote_control_program.event_count": events.length,
        "remote_control_program.entry_count": sentEntryCount,
        "remote_control_program.dropped_entry_count": droppedEntryCount,
      });

      try {
        await realtime.publishToCitizens(events);
        recordPublication(batches);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        metrics.errors.add(1, { stage: DeliveryStage.Publication });
        // No ids of citizens and no entries. The errors of the realtime port contain only the URL, the status and the answer of the server.
        context.log.error("Failed to publish feed entries to a viewer", {
          eventCount: events.length,
          entryCount: sentEntryCount,
          error,
        });

        if (isClosing) {
          metrics.droppedEntries.add(sentEntryCount, {
            reason: DroppedEntryReason.Closed,
          });
          return;
        }

        // The next flush sends them again. The consumer client removes the duplicates of the events that arrived.
        queue.droppedEntryCount += droppedEntryCount;
        queue.waitingEntries.unshift(
          ...batches.flatMap((batch) =>
            batch.map(({ waitingEntry }) => waitingEntry),
          ),
        );
        waitingEntryCount += sentEntryCount;
        applyViewerLimit(queue);
        applyTotalLimit();
      }
    });

  const onIntervalEnd = (viewerCitizenId: string, queue: ViewerQueue) => {
    queue.timer = null;
    if (queue.waitingEntries.length > 0) startFlush(viewerCitizenId, queue);
    else if (queue.droppedEntryCount === 0) queues.delete(viewerCitizenId);
  };

  const startFlush = (viewerCitizenId: string, queue: ViewerQueue) => {
    queue.flush = flush(viewerCitizenId, queue)
      .catch((error: unknown) => {
        metrics.errors.add(1, { stage: DeliveryStage.Publication });
        context.log.error("Failed to flush the feed entries of a viewer", {
          error,
        });
      })
      .finally(() => {
        queue.flush = null;
        if (isClosing) return;

        const remainingMilliseconds =
          (queue.lastFlushStartedAt ?? 0) +
          FLUSH_INTERVAL_MILLISECONDS -
          Date.now();
        queue.timer = setTimeout(
          () => {
            onIntervalEnd(viewerCitizenId, queue);
          },
          Math.max(0, remainingMilliseconds),
        );
      });
  };

  const collect = async (
    { ownerCitizenId, capabilityId, entries }: FeedEntryDeliveryInput,
    acceptedAt: number,
  ) => {
    const viewers = await findViewers(context, {
      ownerCitizenId,
      capabilityId,
    });

    const changedQueues = new Map<string, ViewerQueue>();
    for (const { viewerCitizenId, visibleTimeRange } of viewers) {
      const visibleEntries = entries
        .filter((entry) =>
          isInVisibleTimeRange(visibleTimeRange, entry.eventAt),
        )
        .map((entry) => ({ entry, acceptedAt }));
      if (visibleEntries.length === 0) continue;

      let queue = queues.get(viewerCitizenId);
      if (!queue) {
        queue = {
          waitingEntries: [],
          droppedEntryCount: 0,
          lastFlushStartedAt: null,
          timer: null,
          flush: null,
        };
        queues.set(viewerCitizenId, queue);
      }
      queue.waitingEntries.push(...visibleEntries);
      waitingEntryCount += visibleEntries.length;
      applyViewerLimit(queue);
      changedQueues.set(viewerCitizenId, queue);
    }
    applyTotalLimit();

    // A queue without a running flush and without a timer has no publication in the interval
    for (const [viewerCitizenId, queue] of changedQueues)
      if (!queue.flush && !queue.timer && !isClosing)
        startFlush(viewerCitizenId, queue);
  };

  const deliver = (input: FeedEntryDeliveryInput) => {
    if (isClosing || input.entries.length === 0) return;

    const collection: Promise<void> = collect(input, Date.now())
      .catch((error: unknown) => {
        metrics.errors.add(1, { stage: DeliveryStage.Collection });
        // No ids of citizens and no entries
        context.log.error(
          "Failed to collect new feed entries for the viewers",
          {
            capabilityId: input.capabilityId,
            entryCount: input.entries.length,
            error,
          },
        );
      })
      .finally(() => {
        pendingCollections.delete(collection);
      });
    pendingCollections.add(collection);
  };

  const closeQueues = async () => {
    await Promise.allSettled(pendingCollections);

    for (const queue of queues.values()) {
      if (queue.timer) clearTimeout(queue.timer);
      queue.timer = null;
    }
    await Promise.allSettled(
      Array.from(queues.values(), (queue) => queue.flush),
    );

    for (const [viewerCitizenId, queue] of queues)
      if (queue.waitingEntries.length > 0) startFlush(viewerCitizenId, queue);
    await Promise.allSettled(
      Array.from(queues.values(), (queue) => queue.flush),
    );

    queues.clear();
    waitingEntryCount = 0;
  };

  const close = () => {
    isClosing = true;
    closing ??= closeQueues();
    return closing;
  };

  return { deliver, close };
};
