import type { CapabilityId } from "@sam-monorepo/domain";

/**
 * The times of the watch leases (see "Delivery to the consumers" of
 * `docs/remote-control-program/README.md`). An open consumer, for example
 * the Log Analyzer, renews its lease at this interval. One renewal in each
 * minute for each open consumer is a small load on the app.
 */
export const WATCH_LEASE_RENEWAL_INTERVAL_MILLISECONDS = 60_000;

/**
 * Three renewal intervals. A hidden browser tab can delay a timer to one run
 * in each minute, thus a renewal can come up to two minutes after the
 * previous one (the Log Analyzer can be in a hidden tab while its overlay
 * shows). The third minute covers one failed renewal. After a consumer
 * closes without `endWatchLease()`, the relay sends new entries to the
 * channel of the viewer for at most this time. The viewer can read these
 * entries, thus this costs only messages.
 */
export const WATCH_LEASE_MILLISECONDS = 3 * 60_000;

/**
 * The same maximum as the page size of the lists (`MAXIMUM_PAGE_LIMIT`) and
 * the list of `listSharingOwners()`, thus a consumer can watch each owner of
 * that list
 */
export const MAXIMUM_WATCHED_OWNERS = 100;

/**
 * The valid leases of one viewer for one capability: one for each open
 * consumer (a tab, an overlay window, a device). A person seldom has more
 * than some of them open. A consumer that opens again (for example after a
 * reload) makes a new lease, and the lease of the closed consumer stays valid
 * until its expiry when the consumer could not end it. 20 leaves space for
 * this. The limit bounds the rows that one viewer can make, and the rows of
 * the viewer at each delivery (`findWatchingViewers()`).
 */
export const MAXIMUM_WATCH_LEASES_PER_VIEWER = 20;

/** The lease of one consumer of a viewer for one capability */
export interface WatchLease {
  readonly consumerId: string;
  readonly capabilityId: CapabilityId;
  /** Empty: all owners that the viewer can read */
  readonly ownerCitizenIds: string[];
  /** The relay sends nothing for this lease after this time */
  readonly expiresAt: Date;
  /** The consumer renews the lease after this time */
  readonly renewalIntervalMilliseconds: number;
  /**
   * True when the lease of this consumer was valid until the renewal and
   * covered all owners of the renewal. False when the relay can have skipped
   * new entries for this consumer: the first lease, an expired lease, or more
   * owners than before. Then the consumer reads the changes since its cursor.
   */
  readonly isContinuous: boolean;
}
