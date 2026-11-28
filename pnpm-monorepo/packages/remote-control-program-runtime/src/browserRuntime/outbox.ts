import { LOG_ENTRIES_CAPABILITY } from "@sam-monorepo/domain";
import type { FeedEntry } from "../channel/channelTypes.js";
import type { LocalAccessLayer } from "../localAccess/localAccessLayer.js";
import type { RawMatch } from "../logFile/types.js";
import { MAXIMUM_OWN_ENTRIES } from "./ownEntryStore.js";

/**
 * The entries that the runtime gives to the channel client at one time: two
 * batches. The others wait in the outbox. Thus the rules of the local access
 * layer apply again right before each send (a type that the owner turned off
 * stops its entries), and a large request for older entries does not fill
 * the queue of the channel client.
 */
export const OUTBOX_CHANNEL_ENTRY_LIMIT =
  2 * LOG_ENTRIES_CAPABILITY.maximumEntriesPerBatch;

/**
 * The entries that wait in the outbox, for example while the relay is not
 * available. The outbox holds the entries of the store, thus its limit is the
 * limit of the store. Above it, the oldest entries stay on the machine, for
 * example after a long time without a connection.
 */
const MAXIMUM_OUTBOX_ENTRIES = MAXIMUM_OWN_ENTRIES;

interface OutboxEntry {
  readonly entry: RawMatch;
  /** The owner confirmed it in a request for older entries */
  readonly isConfirmed: boolean;
}

/** Null for an entry without a valid time. The relay would refuse it. */
const toFeedEntry = (entry: RawMatch): FeedEntry | null => {
  const time = Date.parse(entry.isoDate);
  if (Number.isNaN(time)) return null;

  return {
    type: entry.type,
    raw_line: entry.rawLine,
    event_at: new Date(time).toISOString(),
    line_number: entry.lineNumber,
    game_environment: entry.gameEnvironment,
    game_build: entry.gameBuild,
  };
};

/**
 * The entries of the runtime that wait for the channel client, only in
 * memory: also while there is no connection, until the `welcome` of the next
 * connection. A closed tab or a crash loses them.
 */
export class Outbox {
  #entries: OutboxEntry[] = [];
  /**
   * The outbox dropped entries since it was last empty. Thus the console gets
   * one warning, not one for each read.
   */
  #hasDroppedEntries = false;

  get size() {
    return this.#entries.length;
  }

  /** Above the limit of the outbox, the oldest entries leave it */
  add(entries: readonly RawMatch[], isConfirmed: boolean) {
    for (const entry of entries) this.#entries.push({ entry, isConfirmed });

    const excessCount = this.#entries.length - MAXIMUM_OUTBOX_ENTRIES;
    if (excessCount <= 0) return;

    this.#entries.splice(0, excessCount);
    if (this.#hasDroppedEntries) return;

    this.#hasDroppedEntries = true;
    console.warn(
      `[Remote Control Program] The outbox is full (${MAXIMUM_OUTBOX_ENTRIES} entries): the oldest entries stay on this computer.`,
    );
  }

  clear() {
    this.#entries = [];
    this.#hasDroppedEntries = false;
  }

  /**
   * Takes the oldest entries, and gives those that the local access layer
   * permits right before the send: an automatic entry must still go up
   * automatically, and a confirmed entry needs a type that is on and a
   * capability that no switch turned off
   */
  takeSendableEntries(count: number, layer: LocalAccessLayer) {
    const outboxEntries = this.#entries.splice(0, count);
    if (this.#entries.length === 0) this.#hasDroppedEntries = false;

    const automaticEntries = layer.selectAutomaticUploads(
      outboxEntries
        .filter((outboxEntry) => !outboxEntry.isConfirmed)
        .map((outboxEntry) => outboxEntry.entry),
    );
    const confirmedEntries = layer.selectPermittedUploads(
      outboxEntries
        .filter((outboxEntry) => outboxEntry.isConfirmed)
        .map((outboxEntry) => outboxEntry.entry),
    );

    return [...automaticEntries, ...confirmedEntries]
      .map(toFeedEntry)
      .filter((feedEntry) => feedEntry !== null);
  }
}
