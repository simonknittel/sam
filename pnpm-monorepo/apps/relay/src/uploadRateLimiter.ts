/**
 * The rate of the batches of one capability on one connection: one batch in
 * each interval, and a burst of some batches after a pause. It is the
 * generic cell rate algorithm (GCRA), which is equal to a token bucket, but
 * keeps only one time. The channel client of the runtimes spaces its batches
 * with the same algorithm and one batch less of burst.
 */
export class UploadRateLimiter {
  readonly #intervalMilliseconds: number;
  readonly #burstToleranceMilliseconds: number;
  /** The time of the next batch when the runtime sends at the full rate */
  #theoreticalNextBatchAt = Number.NEGATIVE_INFINITY;

  constructor(intervalMilliseconds: number, burstBatches: number) {
    this.#intervalMilliseconds = intervalMilliseconds;
    this.#burstToleranceMilliseconds =
      (burstBatches - 1) * intervalMilliseconds;
  }

  /** False when the batch is above the rate. A refused batch does not count. */
  tryTake(now: number) {
    if (now < this.#theoreticalNextBatchAt - this.#burstToleranceMilliseconds)
      return false;

    this.#theoreticalNextBatchAt =
      Math.max(this.#theoreticalNextBatchAt, now) + this.#intervalMilliseconds;
    return true;
  }
}
