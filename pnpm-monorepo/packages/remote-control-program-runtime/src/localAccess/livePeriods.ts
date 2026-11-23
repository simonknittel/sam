/**
 * The live periods of the rule for the upload (decision 27 of
 * `docs/remote-control-program/README.md`): the times in which a running
 * runtime of this browser read the log live and no "Stop all" was active. A
 * log entry goes up automatically only when its time is in a live period and
 * its type was on at that time. The types are not a part of the periods:
 * `turnedOnAt` of each rule limits the periods for its type. Each "Stop all"
 * (of this browser, of the owner, or a switch) removes all periods.
 *
 * The times are milliseconds since the epoch.
 */

/**
 * The running runtime calls `heartbeat()` in this interval. A heartbeat moves
 * the end of the open period to the current time. When a tab closes without
 * the end of the reading (for example a crash), the period ends at the last
 * heartbeat. Thus a short interval keeps the end near the last read. Each
 * heartbeat writes one small value to the storage.
 */
export const LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS = 10_000;

/**
 * A new runtime continues the last period when the previous runtime ended
 * it for a change of the active tab, or sent its last heartbeat, not more
 * than this time before. A stop of the owner ends the period without a
 * continuation. Thus a change of the active tab makes no gap: the Web Locks
 * API gives the lock to the next tab immediately, and the next tab needs
 * some seconds for the `welcome` of the relay. A crashed tab ended its
 * period at its last heartbeat, thus the limit is 3 heartbeat intervals. The
 * limit is short, because the entries of the gap go up automatically,
 * although no runtime read them live.
 */
export const TAB_CHANGE_GAP_MILLISECONDS = 30_000;

/**
 * The running runtime extends its own period when its previous heartbeat is
 * not older than this time. Chromium runs the timers of a hidden tab only
 * once each minute (intensive throttling), thus the limit is 3 minutes. A
 * longer gap shows that the browser froze the tab or the computer slept: the
 * runtime did not read live in that time, and a new period starts.
 */
export const OWN_HEARTBEAT_GAP_MILLISECONDS = 180_000;

/**
 * The runtime keeps a period for this time after its end. The periods serve
 * the entries that a runtime read live but did not upload (the tab closed
 * before the `ack`, or the relay or the network was not available): the next
 * start of a runtime finds them in its first read and uploads them. 7 days
 * cover a pause of some days. The entries of an older period go up only on
 * an explicit request of the owner.
 */
export const LIVE_PERIOD_RETENTION_MILLISECONDS = 7 * 24 * 60 * 60 * 1_000;

/**
 * Only a start without a continuation, a stop of the reading and the end of
 * a "Stop all" start a new period. 100 periods are approximately 14 periods
 * each day during the retention time, and approximately 8 KB in the storage,
 * which the runtime writes at each heartbeat. Above the limit, the oldest
 * periods go: their entries then go up only on an explicit request.
 */
export const MAXIMUM_LIVE_PERIODS = 100;

export interface LivePeriod {
  readonly startedAt: number;
  /**
   * The end of the reading, the "Stop all", or the last heartbeat of an open
   * period
   */
  readonly endedAt: number;
}

export interface LivePeriods {
  /** Ordered by time, without an overlap */
  readonly periods: readonly LivePeriod[];
  /**
   * A runtime read live until the end of the last period, and no stop ended
   * it: the period is open, or the runtime ended for a change of the active
   * tab. A runtime can continue the period (see
   * `TAB_CHANGE_GAP_MILLISECONDS`).
   */
  readonly canContinueLastPeriod: boolean;
}

export const NO_LIVE_PERIODS: LivePeriods = {
  periods: [],
  canContinueLastPeriod: false,
};

const replaceLastPeriod = (
  livePeriods: LivePeriods,
  lastPeriod: LivePeriod,
  canContinueLastPeriod: boolean,
): LivePeriods => ({
  periods: [...livePeriods.periods.slice(0, -1), lastPeriod],
  canContinueLastPeriod,
});

/**
 * Moves the end of the last period to `now` when the gap since its end is
 * not more than the limit. Else starts a new period at `now`.
 */
export const continueOrStartPeriod = (
  livePeriods: LivePeriods,
  now: number,
  gapLimitMilliseconds: number,
): LivePeriods => {
  const lastPeriod = livePeriods.periods.at(-1);

  if (
    lastPeriod &&
    livePeriods.canContinueLastPeriod &&
    now - lastPeriod.endedAt <= gapLimitMilliseconds
  )
    return replaceLastPeriod(
      livePeriods,
      {
        startedAt: lastPeriod.startedAt,
        endedAt: Math.max(lastPeriod.endedAt, now),
      },
      true,
    );

  return {
    periods: [...livePeriods.periods, { startedAt: now, endedAt: now }],
    canContinueLastPeriod: true,
  };
};

/**
 * Ends the last period at `endAt`. A later end than the stored end needs a
 * gap that is not more than the limit, because the runtime must have read
 * until then. An earlier end cuts the period.
 */
export const endLastPeriod = (
  livePeriods: LivePeriods,
  endAt: number,
  gapLimitMilliseconds: number,
  canContinueLastPeriod: boolean,
): LivePeriods => {
  const lastPeriod = livePeriods.periods.at(-1);
  if (!lastPeriod) return NO_LIVE_PERIODS;

  let endedAt = lastPeriod.endedAt;
  if (endAt < lastPeriod.endedAt) {
    endedAt = Math.max(lastPeriod.startedAt, endAt);
  } else if (endAt - lastPeriod.endedAt <= gapLimitMilliseconds) {
    endedAt = endAt;
  }

  return replaceLastPeriod(
    livePeriods,
    { startedAt: lastPeriod.startedAt, endedAt },
    canContinueLastPeriod,
  );
};

/**
 * Keeps the number of periods bounded: removes the periods that ended before
 * the retention time, merges the periods that overlap or touch, and keeps
 * only the newest `MAXIMUM_LIVE_PERIODS` periods.
 */
export const pruneLivePeriods = (
  livePeriods: LivePeriods,
  now: number,
): LivePeriods => {
  const keptPeriods = livePeriods.periods
    .filter(
      (period) =>
        period.endedAt >= period.startedAt &&
        period.endedAt >= now - LIVE_PERIOD_RETENTION_MILLISECONDS,
    )
    .toSorted(
      (firstPeriod, secondPeriod) =>
        firstPeriod.startedAt - secondPeriod.startedAt,
    );

  const mergedPeriods: LivePeriod[] = [];
  for (const period of keptPeriods) {
    const previousPeriod = mergedPeriods.at(-1);

    if (previousPeriod && period.startedAt <= previousPeriod.endedAt) {
      mergedPeriods[mergedPeriods.length - 1] = {
        startedAt: previousPeriod.startedAt,
        endedAt: Math.max(previousPeriod.endedAt, period.endedAt),
      };
    } else {
      mergedPeriods.push(period);
    }
  }

  const periods = mergedPeriods.slice(-MAXIMUM_LIVE_PERIODS);

  return {
    periods,
    canContinueLastPeriod:
      livePeriods.canContinueLastPeriod && periods.length > 0,
  };
};

/**
 * `isLastPeriodOpen`: the running runtime of this tab reads now, thus the
 * last period has no end yet
 */
export const isInLivePeriod = (
  livePeriods: LivePeriods,
  time: number,
  isLastPeriodOpen: boolean,
) => {
  const lastIndex = livePeriods.periods.length - 1;

  return livePeriods.periods.some(
    (period, index) =>
      time >= period.startedAt &&
      (time <= period.endedAt || (isLastPeriodOpen && index === lastIndex)),
  );
};
