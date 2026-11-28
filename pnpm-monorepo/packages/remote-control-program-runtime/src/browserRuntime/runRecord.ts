import * as z from "zod";
import {
  readStoredValue,
  toCitizenKey,
  writeStoredValue,
  type LocalAccessStorage,
} from "../localAccess/localAccessStorage.js";

/**
 * The record of the runtime of a citizen in this browser: the tab with the
 * runtime writes it each `RUN_RECORD_INTERVAL_MILLISECONDS`, at the start, at
 * the stop and when it gives the runtime to a different tab (for example when
 * it closes). The next tab with the runtime reads it, to start a new runtime
 * when the previous one ran, and to keep a stopped runtime stopped (see
 * `BrowserRuntime.shouldRun`). The record does not continue the upload: each
 * runtime reads live from its own start.
 */
const BROWSER_RUNTIME_RUN_STORAGE_KEY =
  "remote_control_program_browser_runtime_run";

/**
 * Also while the runtime does not read. Thus the record of a crashed tab is
 * not much older than the crash. Each write is one small value in the
 * storage.
 */
export const RUN_RECORD_INTERVAL_MILLISECONDS = 10_000;

/**
 * The next runtime obeys a record that is not older. Else it obeys the
 * autostart. The Web Locks API gives the lock to the next tab immediately, but
 * a crashed tab wrote its record at its last interval, thus the limit is 3
 * intervals.
 */
export const RUN_RECORD_MAXIMUM_AGE_MILLISECONDS =
  3 * RUN_RECORD_INTERVAL_MILLISECONDS;

/** A stored value of a different version is not used */
const STORAGE_VERSION = 1;

const storedRunRecordSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  is_running: z.boolean(),
  updated_at: z.iso.datetime(),
});

export interface RunRecord {
  /** The runtime runs, or waits for a start (see `setWaitingForStart()`) */
  readonly isRunning: boolean;
  /** Milliseconds since the epoch */
  readonly updatedAt: number;
}

const getRunRecordStorageKey = (citizenId: string) =>
  toCitizenKey(BROWSER_RUNTIME_RUN_STORAGE_KEY, citizenId);

/** Null when there is no valid record */
export const readRunRecord = (
  storage: LocalAccessStorage,
  citizenId: string,
): RunRecord | null => {
  const storedValue = readStoredValue(
    storage,
    getRunRecordStorageKey(citizenId),
    storedRunRecordSchema,
  );
  if (storedValue === null) return null;

  return {
    isRunning: storedValue.is_running,
    updatedAt: Date.parse(storedValue.updated_at),
  };
};

/** Without the record, the next runtime obeys the autostart */
export const writeRunRecord = (
  storage: LocalAccessStorage,
  citizenId: string,
  record: RunRecord,
) => {
  writeStoredValue(storage, getRunRecordStorageKey(citizenId), {
    version: STORAGE_VERSION,
    is_running: record.isRunning,
    updated_at: new Date(record.updatedAt).toISOString(),
  } satisfies z.input<typeof storedRunRecordSchema>);
};

export const removeRunRecord = (
  storage: LocalAccessStorage,
  citizenId: string,
) => {
  storage.removeItem(getRunRecordStorageKey(citizenId));
};
