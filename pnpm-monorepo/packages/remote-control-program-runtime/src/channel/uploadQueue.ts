import {
  CAPABILITY_CATALOG,
  RELAY_LIMITS,
  UpMessageType,
  createUpMessage,
  type FeedEntriesSource,
} from "@sam-monorepo/domain";
import type { FeedEntry } from "./channelTypes.js";

export interface QueuedBatch {
  readonly source: FeedEntriesSource;
  /** The queue adds entries to the last waiting batch while it has space */
  readonly entries: FeedEntry[];
  /** The bytes of the full `feed_entries` message in UTF-8 */
  byteLength: number;
}

const textEncoder = new TextEncoder();

const getByteLength = (text: string) => textEncoder.encode(text).byteLength;

const isSameSource = (first: FeedEntriesSource, second: FeedEntriesSource) =>
  first.capability_id === second.capability_id &&
  first.capability_version === second.capability_version &&
  first.connector_id === second.connector_id &&
  first.connector_version === second.connector_version;

/**
 * The bytes of a `feed_entries` message without entries. The message id has
 * a fixed length. Each entry adds its own bytes, and each entry after the
 * first adds one comma.
 */
const getEmptyBatchByteLength = (source: FeedEntriesSource) =>
  getByteLength(
    JSON.stringify(
      createUpMessage(UpMessageType.FeedEntries, { ...source, entries: [] }),
    ),
  );

/** The bytes of a `feed_entries` message with the entries */
const getBatchByteLength = (
  source: FeedEntriesSource,
  entries: readonly FeedEntry[],
) =>
  entries.reduce(
    (byteLength, entry, index) =>
      byteLength + (index > 0 ? 1 : 0) + getByteLength(JSON.stringify(entry)),
    getEmptyBatchByteLength(source),
  );

export interface AddedEntries {
  /** The oldest waiting batches that the queue removed to stay in its limit */
  readonly droppedBatches: readonly QueuedBatch[];
  /** The entries that do not fit into one message */
  readonly tooLargeEntryCount: number;
}

/**
 * The feed entries that wait for the upload, and the batches that wait for
 * their `ack`. Each batch is in one of the two places only, thus a resend
 * after a reconnect makes no duplicate in the queue.
 */
export class UploadQueue {
  readonly #maximumEntryCount: number;
  /** In the order of the upload */
  #waitingBatches: QueuedBatch[] = [];
  /** By the id of the `feed_entries` message, in the order of the sending */
  readonly #sentBatches = new Map<string, QueuedBatch>();
  #entryCount = 0;

  constructor(maximumEntryCount: number) {
    this.#maximumEntryCount = maximumEntryCount;
  }

  /** The waiting and the sent entries */
  get entryCount() {
    return this.#entryCount;
  }

  get waitingBatches(): readonly QueuedBatch[] {
    return this.#waitingBatches;
  }

  /**
   * Adds the entries in batches of the maximum of the capability, each below
   * `RELAY_LIMITS.maximumMessageBytes`. When the queue is full, it removes
   * the oldest waiting batches.
   */
  add(source: FeedEntriesSource, entries: readonly FeedEntry[]): AddedEntries {
    const maximumEntriesPerBatch =
      CAPABILITY_CATALOG[source.capability_id].maximumEntriesPerBatch;
    const emptyBatchByteLength = getEmptyBatchByteLength(source);
    let tooLargeEntryCount = 0;
    let lastBatch = this.#waitingBatches.at(-1);

    for (const entry of entries) {
      const entryByteLength = getByteLength(JSON.stringify(entry));
      if (
        emptyBatchByteLength + entryByteLength >
        RELAY_LIMITS.maximumMessageBytes
      ) {
        tooLargeEntryCount += 1;
        continue;
      }

      if (
        lastBatch === undefined ||
        !isSameSource(lastBatch.source, source) ||
        lastBatch.entries.length >= maximumEntriesPerBatch ||
        lastBatch.byteLength + 1 + entryByteLength >
          RELAY_LIMITS.maximumMessageBytes
      ) {
        lastBatch = {
          source,
          entries: [entry],
          byteLength: emptyBatchByteLength + entryByteLength,
        };
        this.#waitingBatches.push(lastBatch);
      } else {
        lastBatch.entries.push(entry);
        lastBatch.byteLength += 1 + entryByteLength;
      }

      this.#entryCount += 1;
    }

    const droppedBatches: QueuedBatch[] = [];
    while (this.#entryCount > this.#maximumEntryCount) {
      const oldestBatch = this.#waitingBatches.shift();
      if (oldestBatch === undefined) break;

      this.#entryCount -= oldestBatch.entries.length;
      droppedBatches.push(oldestBatch);
    }

    return { droppedBatches, tooLargeEntryCount };
  }

  markSent(batch: QueuedBatch, messageId: string) {
    this.#waitingBatches = this.#waitingBatches.filter(
      (waitingBatch) => waitingBatch !== batch,
    );
    this.#sentBatches.set(messageId, batch);
  }

  /** Removes the batch of an `ack`. Null for a different message. */
  takeSent(messageId: string) {
    const batch = this.#sentBatches.get(messageId);
    if (batch === undefined) return null;

    this.#sentBatches.delete(messageId);
    this.#entryCount -= batch.entries.length;
    return batch;
  }

  /** Puts a refused batch back to the front, to send it again */
  returnToFront(batch: QueuedBatch) {
    this.#waitingBatches.unshift(batch);
    this.#entryCount += batch.entries.length;
  }

  /**
   * Puts the batches without an `ack` back to the front, after a lost
   * connection
   */
  returnSent() {
    this.#waitingBatches = [
      ...this.#sentBatches.values(),
      ...this.#waitingBatches,
    ];
    this.#sentBatches.clear();
  }

  /**
   * Keeps only the given entries of a waiting batch. A batch without entries
   * leaves the queue.
   */
  keepEntries(batch: QueuedBatch, entries: readonly FeedEntry[]) {
    this.#entryCount -= batch.entries.length - entries.length;

    if (entries.length === 0) {
      this.#waitingBatches = this.#waitingBatches.filter(
        (waitingBatch) => waitingBatch !== batch,
      );
      return;
    }

    batch.entries.splice(0, batch.entries.length, ...entries);
    batch.byteLength = getBatchByteLength(batch.source, entries);
  }

  removeWaiting(shouldRemove: (batch: QueuedBatch) => boolean) {
    const removedBatches = this.#waitingBatches.filter(shouldRemove);
    if (removedBatches.length === 0) return removedBatches;

    this.#waitingBatches = this.#waitingBatches.filter(
      (batch) => !removedBatches.includes(batch),
    );
    for (const batch of removedBatches)
      this.#entryCount -= batch.entries.length;
    return removedBatches;
  }
}
