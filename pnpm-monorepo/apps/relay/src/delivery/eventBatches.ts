import type { FeedLogEntry } from "@sam-monorepo/application";
import {
  CapabilityId,
  MAXIMUM_FEED_DELIVERY_EVENT_ENTRIES,
  type FeedDeliveryEventPayload,
} from "@sam-monorepo/domain";

type DeliveredLogEntry = FeedDeliveryEventPayload["entries"][number];

/** An entry in the queue of one viewer */
export interface WaitingEntry {
  readonly entry: FeedLogEntry;
  /** The time of the call of `deliver` (`Date.now()`) */
  readonly acceptedAt: number;
}

export interface PreparedEntry {
  readonly waitingEntry: WaitingEntry;
  readonly deliveredEntry: DeliveredLogEntry;
}

export interface EventBatches {
  /** Each batch is the entries of one event, in the order of the input */
  readonly batches: readonly (readonly PreparedEntry[])[];
  /** The entries that are larger than the limit alone */
  readonly tooLargeEntries: readonly WaitingEntry[];
}

/**
 * The largest value of `dropped_entry_count`. The size of the payload
 * without entries uses it, thus each count fits.
 */
const MAXIMUM_INT32 = 2_147_483_647;

const getJsonByteLength = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

const toDeliveredLogEntry = (entry: FeedLogEntry): DeliveredLogEntry => ({
  id: entry.id,
  owner: { id: entry.owner.id, handle: entry.owner.handle },
  type: entry.type,
  raw_line: entry.rawLine,
  event_at: entry.eventAt.toISOString(),
  line_number: entry.lineNumber,
  hash: entry.hash,
  created_at: entry.createdAt.toISOString(),
});

/**
 * Splits the waiting entries of one viewer into the entries of events. The
 * JSON of each payload (`FeedDeliveryEventPayload`) has a maximum of
 * `maximumPayloadBytes` bytes in UTF-8, and a maximum of
 * `MAXIMUM_FEED_DELIVERY_EVENT_ENTRIES` entries.
 */
export const splitIntoEventBatches = (
  waitingEntries: readonly WaitingEntry[],
  maximumPayloadBytes: number,
): EventBatches => {
  const emptyPayloadBytes = getJsonByteLength({
    capability_id: CapabilityId.LogEntries,
    entries: [],
    dropped_entry_count: MAXIMUM_INT32,
  } satisfies FeedDeliveryEventPayload);

  const batches: PreparedEntry[][] = [];
  const tooLargeEntries: WaitingEntry[] = [];
  let batch: PreparedEntry[] = [];
  let batchBytes = emptyPayloadBytes;

  for (const waitingEntry of waitingEntries) {
    const deliveredEntry = toDeliveredLogEntry(waitingEntry.entry);
    const entryBytes = getJsonByteLength(deliveredEntry);
    if (emptyPayloadBytes + entryBytes > maximumPayloadBytes) {
      tooLargeEntries.push(waitingEntry);
      continue;
    }

    // The comma between two entries of the array
    const separatorBytes = batch.length > 0 ? 1 : 0;
    if (
      batch.length >= MAXIMUM_FEED_DELIVERY_EVENT_ENTRIES ||
      batchBytes + separatorBytes + entryBytes > maximumPayloadBytes
    ) {
      batches.push(batch);
      batch = [];
      batchBytes = emptyPayloadBytes;
    }

    batchBytes += (batch.length > 0 ? 1 : 0) + entryBytes;
    batch.push({ waitingEntry, deliveredEntry });
  }
  if (batch.length > 0) batches.push(batch);

  return { batches, tooLargeEntries };
};
