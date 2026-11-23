import { runtimeIdSchema } from "@sam-monorepo/domain";

/** The id of the runtime of this browser. All tabs share it. */
const RUNTIME_ID_STORAGE_KEY = "remote_control_program_runtime_id";

/**
 * The autostart of the old Log Analyzer (a JSON boolean of `useLocalStorage`
 * of `@uidotdev/usehooks`). The autostart moved into the runtime, thus the
 * runtime uses the same key and the users keep their setting.
 */
export const AUTOSTART_STORAGE_KEY = "is_autostart_enabled";

/**
 * The id that the browser keeps: a random lowercase UUID. Only the tab of
 * the runtime calls it, thus two tabs do not make two ids at the same time.
 */
export const getRuntimeId = (storage: Storage) => {
  const storedId = storage.getItem(RUNTIME_ID_STORAGE_KEY);
  if (storedId !== null && runtimeIdSchema.safeParse(storedId).success)
    return storedId;

  const runtimeId = crypto.randomUUID();
  storage.setItem(RUNTIME_ID_STORAGE_KEY, runtimeId);
  return runtimeId;
};

export const readAutostart = (storage: Storage) => {
  try {
    return (
      JSON.parse(storage.getItem(AUTOSTART_STORAGE_KEY) ?? "false") === true
    );
  } catch {
    return false;
  }
};

export const writeAutostart = (storage: Storage, isEnabled: boolean) => {
  storage.setItem(AUTOSTART_STORAGE_KEY, JSON.stringify(isEnabled));
};
