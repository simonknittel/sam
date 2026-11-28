/// <reference types="@types/wicg-file-system-access" />

import { toCitizenKey } from "@sam-monorepo/remote-control-program-runtime";
import {
  createStore,
  get,
  promisifyRequest,
  set,
  type UseStore,
} from "idb-keyval";
import { LogFolderState, type LogFolderStatus } from "./types";

/**
 * The key of the folder handle of the citizen in the default store of
 * `idb-keyval`
 */
const FOLDER_HANDLE_KEY = "remote_control_program_log_folder";

/** The folder handle of the old Log Analyzer, without a citizen */
const LEGACY_FOLDER_HANDLE_KEY = "directory_handle";

/** The database and the store of the default store of `idb-keyval` */
const DEFAULT_DATABASE_NAME = "keyval-store";
const DEFAULT_STORE_NAME = "keyval";

/** Opens the database only in the browser, at the first use */
let defaultStore: UseStore | null = null;
const getDefaultStore = () =>
  (defaultStore ??= createStore(DEFAULT_DATABASE_NAME, DEFAULT_STORE_NAME));

const getFolderHandleKey = (citizenId: string) =>
  toCitizenKey(FOLDER_HANDLE_KEY, citizenId);

/**
 * The runtime needs the File System Access API (only Chromium browsers),
 * the Web Locks API, the BroadcastChannel API and the browser storage
 */
export const isBrowserRuntimeSupported = () => {
  if (
    typeof window === "undefined" ||
    !("showDirectoryPicker" in window) ||
    !("locks" in navigator) ||
    !("BroadcastChannel" in window)
  )
    return false;

  try {
    // Throws when the user blocks the storage of the site
    return window.localStorage !== null && window.indexedDB !== null;
  } catch {
    return false;
  }
};

const readStoredFolder = async (citizenId: string) => {
  const value: unknown = await get(
    getFolderHandleKey(citizenId),
    getDefaultStore(),
  );
  return value instanceof FileSystemDirectoryHandle ? value : null;
};

/**
 * The folder of the old Log Analyzer goes to the first citizen whose runtime
 * starts in this browser: it becomes the folder of the citizen when the
 * citizen has none. Then the old key goes away, thus no other citizen gets
 * it. One transaction, thus two tabs cannot both get it.
 */
export const claimLegacyLogFolder = (citizenId: string) =>
  getDefaultStore()("readwrite", async (store) => {
    const legacyHandle: unknown = await promisifyRequest(
      store.get(LEGACY_FOLDER_HANDLE_KEY),
    );
    if (legacyHandle === undefined) return;

    const key = getFolderHandleKey(citizenId);
    const handle: unknown = await promisifyRequest(store.get(key));
    if (handle === undefined) store.put(legacyHandle, key);
    store.delete(LEGACY_FOLDER_HANDLE_KEY);

    await promisifyRequest(store.transaction);
  });

export interface LoadedLogFolder {
  readonly handle: FileSystemDirectoryHandle | null;
  readonly status: LogFolderStatus;
}

/** The stored folder of the citizen and its read permission, without a prompt */
export const loadLogFolder = async (
  citizenId: string,
): Promise<LoadedLogFolder> => {
  const handle = await readStoredFolder(citizenId);
  if (!handle)
    return {
      handle: null,
      status: { state: LogFolderState.NotSelected, name: null },
    };

  const permission = await handle.queryPermission({ mode: "read" });
  return {
    handle,
    status: {
      state:
        permission === "granted"
          ? LogFolderState.Granted
          : LogFolderState.PermissionNeeded,
      name: handle.name,
    },
  };
};

/**
 * Needs a user gesture. Opens the folder picker and keeps the folder for the
 * citizen. False when the user closed the picker.
 */
export const pickLogFolder = async (citizenId: string) => {
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ mode: "read" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return false;
    throw error;
  }

  await set(getFolderHandleKey(citizenId), handle, getDefaultStore());
  return true;
};

/**
 * Needs a user gesture. Asks for the read permission of the stored folder.
 * The permission applies to all tabs of SAM. False without a folder, or when
 * the user did not give the permission.
 */
export const requestLogFolderPermission = async (citizenId: string) => {
  const handle = await readStoredFolder(citizenId);
  if (!handle) return false;

  return (await handle.requestPermission({ mode: "read" })) === "granted";
};
