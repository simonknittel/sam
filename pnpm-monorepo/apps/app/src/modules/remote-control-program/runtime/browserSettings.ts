import { runtimeIdSchema } from "@sam-monorepo/domain";
import { toCitizenKey } from "@sam-monorepo/remote-control-program-runtime";

/** The id of the runtime of the citizen in this browser. All tabs share it. */
const RUNTIME_ID_STORAGE_KEY = "remote_control_program_runtime_id";

/** The autostart of the citizen in this browser: a JSON boolean */
const AUTOSTART_STORAGE_KEY = "remote_control_program_autostart";

/**
 * The autostart of the old Log Analyzer (a JSON boolean of `useLocalStorage`
 * of `@uidotdev/usehooks`), without a citizen
 */
const LEGACY_AUTOSTART_STORAGE_KEY = "is_autostart_enabled";

/** For the `storage` event of the other tabs */
export const getAutostartStorageKey = (citizenId: string) =>
  toCitizenKey(AUTOSTART_STORAGE_KEY, citizenId);

/**
 * The id that the browser keeps for the citizen: a random lowercase UUID.
 * Only the tab of the runtime calls it, thus two tabs do not make two ids at
 * the same time.
 */
export const getRuntimeId = (storage: Storage, citizenId: string) => {
  const key = toCitizenKey(RUNTIME_ID_STORAGE_KEY, citizenId);
  const storedId = storage.getItem(key);
  if (storedId !== null && runtimeIdSchema.safeParse(storedId).success)
    return storedId;

  const runtimeId = crypto.randomUUID();
  storage.setItem(key, runtimeId);
  return runtimeId;
};

export const readAutostart = (storage: Storage, citizenId: string) => {
  try {
    return (
      JSON.parse(
        storage.getItem(getAutostartStorageKey(citizenId)) ?? "false",
      ) === true
    );
  } catch {
    return false;
  }
};

export const writeAutostart = (
  storage: Storage,
  citizenId: string,
  isEnabled: boolean,
) => {
  storage.setItem(getAutostartStorageKey(citizenId), JSON.stringify(isEnabled));
};

/**
 * The autostart of the old Log Analyzer goes to the first citizen whose
 * runtime starts in this browser: it becomes the autostart of the citizen
 * when the citizen has none. Then the old key goes away, thus no other
 * citizen gets it.
 */
export const claimLegacyAutostart = (storage: Storage, citizenId: string) => {
  const legacyValue = storage.getItem(LEGACY_AUTOSTART_STORAGE_KEY);
  if (legacyValue === null) return;

  const key = getAutostartStorageKey(citizenId);
  if (storage.getItem(key) === null) storage.setItem(key, legacyValue);
  storage.removeItem(LEGACY_AUTOSTART_STORAGE_KEY);
};
