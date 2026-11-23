/// <reference types="@types/wicg-file-system-access" />

import { get, set } from "idb-keyval";
import { LogFolderState, type LogFolderStatus } from "./types";

/**
 * The key of the folder handle of the old Log Analyzer in the default store
 * of `idb-keyval`. The runtime uses the same key, thus the users do not
 * select their folder again.
 */
const FOLDER_HANDLE_KEY = "directory_handle";

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

const readStoredFolder = async () => {
  const value: unknown = await get(FOLDER_HANDLE_KEY);
  return value instanceof FileSystemDirectoryHandle ? value : null;
};

export interface LoadedLogFolder {
  readonly handle: FileSystemDirectoryHandle | null;
  readonly status: LogFolderStatus;
}

/** The stored folder and its read permission, without a prompt */
export const loadLogFolder = async (): Promise<LoadedLogFolder> => {
  const handle = await readStoredFolder();
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
 * Needs a user gesture. Opens the folder picker and keeps the folder. False
 * when the user closed the picker.
 */
export const pickLogFolder = async () => {
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ mode: "read" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return false;
    throw error;
  }

  await set(FOLDER_HANDLE_KEY, handle);
  return true;
};

/**
 * Needs a user gesture. Asks for the read permission of the stored folder.
 * The permission applies to all tabs of SAM. False without a folder, or when
 * the user did not give the permission.
 */
export const requestLogFolderPermission = async () => {
  const handle = await readStoredFolder();
  if (!handle) return false;

  return (await handle.requestPermission({ mode: "read" })) === "granted";
};
