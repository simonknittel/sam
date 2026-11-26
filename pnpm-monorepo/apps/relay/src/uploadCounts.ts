import type { FeedEntryUploadCounts } from "@sam-monorepo/application";
import type { CapabilityId } from "@sam-monorepo/domain";

export interface UploadCountPeriod {
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly countsByCapability: ReadonlyMap<CapabilityId, FeedEntryUploadCounts>;
}

/**
 * The sums of the counts of `appendFeedEntries()` for each capability of one
 * connection in one period. The relay service writes them with
 * `recordFeedEntryUploadCounts()` at the close of the connection and at the
 * latest each hour.
 */
export class UploadCounts {
  #periodStartedAt: Date;
  #countsByCapability = new Map<CapabilityId, FeedEntryUploadCounts>();

  /** @param periodStartedAt The `connectedAt` of the connection */
  constructor(periodStartedAt: Date) {
    this.#periodStartedAt = periodStartedAt;
  }

  get periodStartedAt() {
    return this.#periodStartedAt;
  }

  add(capabilityId: CapabilityId, counts: FeedEntryUploadCounts) {
    const sums = this.#countsByCapability.get(capabilityId);

    this.#countsByCapability.set(capabilityId, {
      newEntryCount: (sums?.newEntryCount ?? 0) + counts.newEntryCount,
      duplicateEntryCount:
        (sums?.duplicateEntryCount ?? 0) + counts.duplicateEntryCount,
      refusedEntryCount:
        (sums?.refusedEntryCount ?? 0) + counts.refusedEntryCount,
    });
  }

  /** Gives the counts of the current period, and starts the next period */
  takePeriod(endedAt: Date): UploadCountPeriod {
    const period = {
      startedAt: this.#periodStartedAt,
      endedAt,
      countsByCapability: this.#countsByCapability,
    };

    this.#periodStartedAt = endedAt;
    this.#countsByCapability = new Map();
    return period;
  }
}
