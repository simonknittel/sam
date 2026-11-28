const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/**
 * An older entry is history: each viewer with access to the Log Analyzer reads
 * it without a grant (decision 31 of `docs/remote-control-program/README.md`)
 */
export const LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS = 8;

/** The entries before this time are history */
export const getLogAnalyzerHistoryEnd = (now: Date) =>
  new Date(
    now.getTime() -
      LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS * MILLISECONDS_PER_HOUR,
  );
