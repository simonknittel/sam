import {
  getOldestLogAnalyzerEntryVersion,
  type LogAnalyzerEntryType,
  toLogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { type LivePeriods, NO_LIVE_PERIODS } from "./livePeriods.js";

/**
 * The browser storage of the runtime. `localStorage` has this shape. The app
 * gives it, thus the package does not read the globals of the browser.
 */
export interface LocalAccessStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The name of a value in the browser storage, of a Web Lock or of a
 * BroadcastChannel of one citizen. More than one citizen can use one browser
 * profile, one after the other: they never share a value, a Web Lock or a
 * BroadcastChannel, thus the runtime of a citizen never uploads with the
 * settings, the live periods or the log folder of a different citizen.
 *
 * Example: `remote_control_program_live_periods:<citizen id>`
 */
export const toCitizenKey = (key: string, citizenId: string) =>
  `${key}:${citizenId}`;

/**
 * The settings of the owner in this browser: the rules for each log entry
 * type. Each tab can write it (for example the sharing popover).
 */
const LOCAL_ACCESS_LAYER_STORAGE_KEY =
  "remote_control_program_local_access_layer";

/**
 * The live periods (see `livePeriods.ts`). Only the tab with the running
 * runtime extends them.
 */
const LIVE_PERIODS_STORAGE_KEY = "remote_control_program_live_periods";

/**
 * The share settings of the old Log Analyzer. The layer removes them and does
 * not take them over (M1 of `docs/remote-control-program/migration.md`).
 */
export const LEGACY_SHARE_TYPES_STORAGE_KEY = "log_analyzer_share_types";

/** For the `storage` event of the other tabs */
export const getLocalAccessLayerStorageKey = (citizenId: string) =>
  toCitizenKey(LOCAL_ACCESS_LAYER_STORAGE_KEY, citizenId);

const getLivePeriodsStorageKey = (citizenId: string) =>
  toCitizenKey(LIVE_PERIODS_STORAGE_KEY, citizenId);

/** A stored value of a different version gives the defaults */
const STORAGE_VERSION = 1;

/** Far above the number of log entry types (50 in 2026-11) */
const MAXIMUM_STORED_TYPE_RULES = 1_000;

/** The longest value of `LogAnalyzerEntryType` has 33 characters */
const MAXIMUM_TYPE_LENGTH = 100;

/**
 * Far above `MAXIMUM_LIVE_PERIODS`, thus a value with more periods (for
 * example of a later version of the app) still gives its newest periods
 */
const MAXIMUM_STORED_PERIODS = 1_000;

const storedLocalAccessLayerSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  /** The types that are on. A type that is off has no item. */
  log_entry_types: z
    .array(
      z.object({
        /** The oldest version of the type (`supersedes`) */
        type: z.string().max(MAXIMUM_TYPE_LENGTH),
        turned_on_at: z.iso.datetime(),
      }),
    )
    .max(MAXIMUM_STORED_TYPE_RULES),
});

const storedLivePeriodsSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  periods: z
    .array(
      z.object({
        started_at: z.iso.datetime(),
        ended_at: z.iso.datetime(),
      }),
    )
    .max(MAXIMUM_STORED_PERIODS),
  /** See `LivePeriods.canContinueLastPeriod` */
  can_continue_last_period: z.boolean(),
});

export interface LocalAccessRules {
  /**
   * The log entry types that are on, by their oldest version, with the time
   * when the owner turned them on. All versions of a type share one rule, so
   * that a new version of a pattern keeps the rule of the owner.
   */
  readonly turnedOnAtByType: ReadonlyMap<LogAnalyzerEntryType, number>;
}

/** All types are off */
const DEFAULT_RULES: LocalAccessRules = { turnedOnAtByType: new Map() };

/**
 * Null when there is no value, or the value is not valid JSON or does not
 * match the schema
 */
export const readStoredValue = <Value>(
  storage: LocalAccessStorage,
  key: string,
  schema: z.ZodType<Value>,
) => {
  const text = storage.getItem(key);
  if (text === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  const result = schema.safeParse(value);
  return result.success ? result.data : null;
};

/**
 * Writes only a changed value. Thus a method without a change fires no
 * `storage` event in the other tabs.
 *
 * When the write fails (for example in a full storage), the value goes away:
 * no value is the safe default of each key (all types off, no live period,
 * no run record). Thus a failed write never keeps a stale value that permits
 * an upload.
 */
export const writeStoredValue = (
  storage: LocalAccessStorage,
  key: string,
  value: unknown,
) => {
  const text = JSON.stringify(value);

  try {
    if (storage.getItem(key) !== text) storage.setItem(key, text);
  } catch (error) {
    console.error(
      "[Remote Control Program] Error writing the browser storage:",
      error,
    );
    storage.removeItem(key);
  }
};

const toTime = (isoDate: string) => new Date(isoDate).getTime();

const toIsoDate = (time: number) => new Date(time).toISOString();

/** A broken value gives the defaults: all types are off */
export const readLocalAccessRules = (
  storage: LocalAccessStorage,
  citizenId: string,
): LocalAccessRules => {
  const storedValue = readStoredValue(
    storage,
    getLocalAccessLayerStorageKey(citizenId),
    storedLocalAccessLayerSchema,
  );
  if (!storedValue) return DEFAULT_RULES;

  const turnedOnAtByType = new Map<LogAnalyzerEntryType, number>();
  for (const rule of storedValue.log_entry_types) {
    // A type that this version of the app does not know stays off
    const type = toLogAnalyzerEntryType(rule.type);
    if (type === undefined) continue;

    turnedOnAtByType.set(
      getOldestLogAnalyzerEntryVersion(type),
      toTime(rule.turned_on_at),
    );
  }

  return { turnedOnAtByType };
};

export const writeLocalAccessRules = (
  storage: LocalAccessStorage,
  citizenId: string,
  rules: LocalAccessRules,
) => {
  writeStoredValue(storage, getLocalAccessLayerStorageKey(citizenId), {
    version: STORAGE_VERSION,
    log_entry_types: Array.from(
      rules.turnedOnAtByType,
      ([type, turnedOnAt]) => ({
        type,
        turned_on_at: toIsoDate(turnedOnAt),
      }),
    ),
  } satisfies z.input<typeof storedLocalAccessLayerSchema>);
};

/** A broken value gives no periods: no entry goes up automatically */
export const readLivePeriods = (
  storage: LocalAccessStorage,
  citizenId: string,
): LivePeriods => {
  const storedValue = readStoredValue(
    storage,
    getLivePeriodsStorageKey(citizenId),
    storedLivePeriodsSchema,
  );
  if (!storedValue) return NO_LIVE_PERIODS;

  return {
    periods: storedValue.periods.map((period) => ({
      startedAt: toTime(period.started_at),
      endedAt: toTime(period.ended_at),
    })),
    canContinueLastPeriod: storedValue.can_continue_last_period,
  };
};

export const writeLivePeriods = (
  storage: LocalAccessStorage,
  citizenId: string,
  livePeriods: LivePeriods,
) => {
  writeStoredValue(storage, getLivePeriodsStorageKey(citizenId), {
    version: STORAGE_VERSION,
    periods: livePeriods.periods.map((period) => ({
      started_at: toIsoDate(period.startedAt),
      ended_at: toIsoDate(period.endedAt),
    })),
    can_continue_last_period: livePeriods.canContinueLastPeriod,
  } satisfies z.input<typeof storedLivePeriodsSchema>);
};
