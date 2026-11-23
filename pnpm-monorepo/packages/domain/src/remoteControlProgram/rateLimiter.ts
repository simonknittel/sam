/**
 * A rate of events with a burst: one event in each interval, and a burst of
 * some events after a pause. It is the generic cell rate algorithm (GCRA),
 * which is equal to a token bucket, but keeps only one time.
 *
 * The relay service limits the batches of each capability of a runtime with
 * it (see `minimumUploadIntervalMilliseconds` of the catalog and
 * `RELAY_LIMITS.uploadBurstBatches`), and the channel client of a runtime
 * spaces its batches with the same rule and one batch less of burst. The
 * times are milliseconds of one clock, for example `Date.now()`.
 */
export class RateLimiter {
  readonly #intervalMilliseconds: number;
  readonly #burstToleranceMilliseconds: number;
  /** The time of the next event when the events come at the full rate */
  #theoreticalNextEventAt = Number.NEGATIVE_INFINITY;

  /**
   * @param intervalMilliseconds The time for each event at the full rate
   * @param burstSize The events that can come at the same time after a
   * pause, at least 1
   */
  constructor(intervalMilliseconds: number, burstSize: number) {
    if (
      !(intervalMilliseconds > 0) ||
      !Number.isInteger(burstSize) ||
      burstSize < 1
    )
      throw new RangeError(
        "The interval must be above 0, and the burst size must be an integer of at least 1",
      );

    this.#intervalMilliseconds = intervalMilliseconds;
    this.#burstToleranceMilliseconds = (burstSize - 1) * intervalMilliseconds;
  }

  /** The earliest time of the next event that the rate permits */
  getNextAllowedAt() {
    return this.#theoreticalNextEventAt - this.#burstToleranceMilliseconds;
  }

  /** Counts an event, also an event above the rate */
  record(now: number) {
    this.#theoreticalNextEventAt =
      Math.max(this.#theoreticalNextEventAt, now) + this.#intervalMilliseconds;
  }

  /**
   * Counts the event when the rate permits it
   *
   * @returns false when the event is above the rate. A refused event does
   * not count.
   */
  tryTake(now: number) {
    if (now < this.getNextAllowedAt()) return false;

    this.record(now);
    return true;
  }

  /** No event before the end of the delay, and then no burst */
  pause(now: number, delayMilliseconds: number) {
    this.#theoreticalNextEventAt = Math.max(
      this.#theoreticalNextEventAt,
      now + delayMilliseconds + this.#burstToleranceMilliseconds,
    );
  }

  /**
   * True when the full burst is available again: the limiter then acts like
   * a new limiter. A map of limiters (for example one for each owner) can
   * remove it to free the memory.
   */
  isIdle(now: number) {
    return this.#theoreticalNextEventAt <= now;
  }
}
