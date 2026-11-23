import * as z from "zod";
import type { LocalAccessStorage } from "../localAccess/localAccessStorage.js";

/**
 * The record of the runtime of this browser: the tab with the runtime writes
 * it at each heartbeat, at the start, at the stop and when it gives the
 * runtime to a different tab (for example when it closes). The next tab with
 * the runtime reads it, to continue a running runtime without a gap and to
 * keep a stopped runtime stopped (see `BrowserRuntime.shouldRun`).
 */
export const BROWSER_RUNTIME_RUN_STORAGE_KEY =
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

/** Null when there is no valid record */
export const readRunRecord = (
  storage: LocalAccessStorage,
): RunRecord | null => {
  const text = storage.getItem(BROWSER_RUNTIME_RUN_STORAGE_KEY);
  if (text === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  const result = storedRunRecordSchema.safeParse(value);
  if (!result.success) return null;

  return {
    isRunning: result.data.is_running,
    updatedAt: Date.parse(result.data.updated_at),
  };
};

export const writeRunRecord = (
  storage: LocalAccessStorage,
  record: RunRecord,
) => {
  storage.setItem(
    BROWSER_RUNTIME_RUN_STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      is_running: record.isRunning,
      updated_at: new Date(record.updatedAt).toISOString(),
    } satisfies z.input<typeof storedRunRecordSchema>),
  );
};
