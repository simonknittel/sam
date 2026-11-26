import * as z from "zod";
import {
  readStoredValue,
  toCitizenKey,
  writeStoredValue,
  type LocalAccessStorage,
} from "../localAccess/localAccessStorage.js";

/**
 * The record of the runtime of a citizen in this browser: the tab with the
 * runtime writes it at each heartbeat, at the start, at the stop and when it
 * gives the runtime to a different tab (for example when it closes). The next
 * tab with the runtime reads it, to continue a running runtime without a gap
 * and to keep a stopped runtime stopped (see `BrowserRuntime.shouldRun`).
 */
const BROWSER_RUNTIME_RUN_STORAGE_KEY =
  "remote_control_program_browser_runtime_run";

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
