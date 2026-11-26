import {
  CAPABILITY_CATALOG,
  RateLimiter,
  RELAY_LIMITS,
  type CapabilityId,
} from "@sam-monorepo/domain";
import { ONE_HOUR_MILLISECONDS, ONE_MINUTE_MILLISECONDS } from "./time.js";

/** One event in each interval, and a burst of some events after a pause */
export interface Rate {
  readonly intervalMilliseconds: number;
  /** The events that can come at once after a pause, at least 1 */
  readonly burstSize: number;
}

export const createRateLimiter = ({ intervalMilliseconds, burstSize }: Rate) =>
  new RateLimiter(intervalMilliseconds, burstSize);

/**
 * The `hello`s of one owner in one minute, also at once. An owner has one
 * or two runtimes, and a maximum of `RELAY_LIMITS.maximumRuntimesPerOwner`.
 * Each runtime sends one `hello` for each connection: after a restart of the
 * relay service, a lost network, a reload of the page or a change of the
 * active tab, with a random delay that grows with each failed attempt. 10
 * covers two reconnects of 5 runtimes in one minute. Without the limit, one
 * connection token gives an unlimited number of connections.
 */
const MAXIMUM_HELLOS_PER_MINUTE = 10;

const HELLO_RATE: Rate = {
  intervalMilliseconds: ONE_MINUTE_MILLISECONDS / MAXIMUM_HELLOS_PER_MINUTE,
  burstSize: MAXIMUM_HELLOS_PER_MINUTE,
};

/**
 * The entries of one owner in one hour, also at once. One log file gives a
 * maximum of some thousand entries in one hour, two runtimes that read the
 * same log file send each entry twice, and a request for older entries adds
 * some thousand entries (for example 5,000, see `LOG_ENTRIES_CAPABILITY`).
 * The full upload rate of 5 runtimes is 1.8 million entries in one hour: the
 * budget is approximately 1 % of it. A batch above the budget waits on the
 * machine, the runtime sends it again later.
 */
const MAXIMUM_ENTRIES_PER_HOUR = 20_000;

const ENTRY_BUDGET_RATE: Rate = {
  intervalMilliseconds: ONE_HOUR_MILLISECONDS / MAXIMUM_ENTRIES_PER_HOUR,
  burstSize: MAXIMUM_ENTRIES_PER_HOUR,
};

export interface UploadKey {
  readonly ownerCitizenId: string;
  readonly runtimeId: string;
  readonly capabilityId: CapabilityId;
}

const getOrCreate = (
  limiters: Map<string, RateLimiter>,
  key: string,
  create: () => RateLimiter,
) => {
  let limiter = limiters.get(key);
  if (limiter === undefined) {
    limiter = create();
    limiters.set(key, limiter);
  }

  return limiter;
};

/**
 * The rate limits of the owners and of their runtimes. The relay server
 * keeps them for all connections, thus a new connection does not reset
 * them. The times are `Date.now()`.
 */
export class OwnerRateLimits {
  readonly #hellos = new Map<string, RateLimiter>();
  readonly #uploads = new Map<string, RateLimiter>();
  readonly #entryBudgets = new Map<string, RateLimiter>();

  /** False when the owner sent too many `hello`s. A refused `hello` does not count. */
  tryTakeHello(ownerCitizenId: string, now: number) {
    return getOrCreate(this.#hellos, ownerCitizenId, () =>
      createRateLimiter(HELLO_RATE),
    ).tryTake(now);
  }

  /**
   * The batches of one capability of one runtime: the minimum interval of
   * the capability, and a burst of `RELAY_LIMITS.uploadBurstBatches`. False
   * when the batch is above the rate. A refused batch does not count.
   */
  tryTakeUpload(
    { ownerCitizenId, runtimeId, capabilityId }: UploadKey,
    now: number,
  ) {
    return getOrCreate(
      this.#uploads,
      JSON.stringify([ownerCitizenId, runtimeId, capabilityId]),
      () =>
        new RateLimiter(
          CAPABILITY_CATALOG[capabilityId].minimumUploadIntervalMilliseconds,
          RELAY_LIMITS.uploadBurstBatches,
        ),
    ).tryTake(now);
  }

  /**
   * The hourly budget of the entries of one owner. A batch passes when the
   * budget has one entry left, and then counts all its entries. Thus the
   * budget goes below 0 by a maximum of one batch.
   */
  tryTakeEntries(ownerCitizenId: string, entryCount: number, now: number) {
    const budget = getOrCreate(this.#entryBudgets, ownerCitizenId, () =>
      createRateLimiter(ENTRY_BUDGET_RATE),
    );
    if (now < budget.getNextAllowedAt()) return false;

    for (let countedEntries = 0; countedEntries < entryCount; countedEntries++)
      budget.record(now);
    return true;
  }

  /** Removes each limiter that is equal to a new limiter, thus the maps stay small */
  removeIdle(now: number) {
    for (const limiters of [this.#hellos, this.#uploads, this.#entryBudgets])
      for (const [key, limiter] of limiters)
        if (limiter.isIdle(now)) limiters.delete(key);
  }
}
