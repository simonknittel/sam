import { RELAY_LIMITS } from "@sam-monorepo/domain";

/**
 * The numbers of the channel client. The limits of the relay service, which
 * the client also obeys, are in `RELAY_LIMITS` of the catalog.
 */
export const CHANNEL_CLIENT_LIMITS = {
  /**
   * The time for one request to the token source. The same time as the token
   * request of the wiki editor.
   */
  tokenRequestTimeoutMilliseconds: 5_000,
  /**
   * The delay before the client tries again after a failed token renewal, a
   * refused `announce`, or an upload that the relay refused with a temporary
   * error. From the renewal (60 seconds after the token) to the end of the
   * grace time (150 seconds after the token), this gives 9 attempts. The
   * relay can count a refused upload as an error: with this delay, the client
   * stays below `RELAY_LIMITS.maximumErrorsPerMinute`.
   */
  retryDelayMilliseconds: 10_000,
  /** The upper limit of the delay before the first new attempt */
  firstReconnectDelayMilliseconds: 1_000,
  /**
   * The upper limit of the delay when the upper limit doubles with each
   * failed attempt. After 5 failed attempts (31 seconds), each runtime tries
   * 2 to 4 times in each minute: one token request and one connection for
   * each attempt.
   */
  maximumReconnectDelayMilliseconds: 30_000,
  /**
   * The entries that wait for the upload or for their `ack`: 100 full
   * batches, which the client sends in approximately 100 seconds. This is
   * sufficient for a request for older entries (for example 5,000 entries)
   * together with the live entries. 10,000 entries of `log_entries` use some
   * megabytes, and approximately 20 MB when each line has the maximum length
   * of 1,000 characters.
   */
  maximumQueuedEntries: 10_000,
  /**
   * The batches of one capability that the client sends without the minimum
   * interval, for example after a hidden browser tab delayed its timers. One
   * batch less than the relay accepts: the network can make two batches
   * arrive closer together than the client sent them.
   */
  uploadBurstBatches: RELAY_LIMITS.uploadBurstBatches - 1,
} as const;
