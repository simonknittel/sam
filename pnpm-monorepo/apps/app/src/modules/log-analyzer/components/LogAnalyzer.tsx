/// <reference types="@types/wicg-file-system-access" />

"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { track } from "@plausible-analytics/tracker";
import clsx from "clsx";
import { get, set } from "idb-keyval";
import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { FaFileArrowUp } from "react-icons/fa6";
import { useEntryUpload } from "../hooks/useEntryUpload";
import { useLogParser } from "../hooks/useLogParser";
import { useSharedEntries } from "../hooks/useSharedEntries";
import { deleteEntriesBefore, getWindowStart } from "../utils/entryWindow";
import { getFilesRecursively } from "../utils/getFilesRecursively";
import { LIVE_MODE_PARSE_INTERVAL_MS } from "../utils/liveMode";
import {
  createEntryKey,
  deriveEntryFields,
  EntryType,
  type IEntry,
} from "../utils/PATTERNS";
import type { LogFile } from "../utils/types";
import { Introduction } from "./Introduction";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { LogAnalyzerTable } from "./LogAnalyzerTable";
import { useOverlay } from "./OverlayContext";
import { Toolbar } from "./Toolbar";

interface Props {
  readonly className?: string;
}

export const LogAnalyzer = ({ className }: Props) => {
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const {
    isPending,
    startTransition,
    isAutostartEnabled,
    isLiveModeEnabled,
    daysToLoad,
    ownEntryTypes,
    entries,
    setEntries,
  } = useLogAnalyzerContext();

  const authentication = useAuthentication();
  const { pipWindow } = useOverlay();
  const uploadEntries = useEntryUpload();
  const refreshSharedEntries = useSharedEntries();

  const ownCitizen = authentication ? authentication.session.entity : null;

  const parseLogFiles = useLogParser();

  /**
   * A cycle reads only the lines which were added since the cycle before it.
   * This flag makes the next cycle read the whole window again.
   */
  const requiresFullReadRef = useRef(true);

  /**
   * `uploadEntries` changes with each setting of the sharing. A type which is
   * shared from now on needs the entries which were parsed before, and a
   * larger window needs the older lines of the files.
   */
  useEffect(() => {
    requiresFullReadRef.current = true;
  }, [daysToLoad, uploadEntries]);

  const parseLogs = useCallback(
    (isNew = false) => {
      startTransition(async () => {
        if (!directoryHandleRef.current) return;

        try {
          const filterProps = Object.fromEntries(
            Object.values(EntryType).map((type) => [
              `log_analyzer_filter_${type}`,
              ownEntryTypes[type],
            ]),
          );

          track("log_analyzer_parse", {
            props: {
              user_id: authentication
                ? authentication?.session.user.id
                : "unknown",
              log_analyzer_days_to_load: String(daysToLoad),
              log_analyzer_live_mode: String(isLiveModeEnabled),
              log_analyzer_autostart: String(isAutostartEnabled),
              log_analyzer_overlay: String(!!pipWindow),
              ...filterProps,
            },
            interactive: false,
          });
        } catch {
          // Tracking failure should not affect log parsing
        }

        const logFiles: LogFile[] = [];

        for await (const logFile of getFilesRecursively(
          directoryHandleRef.current,
        )) {
          if (!logFile) continue;
          if (!logFile.file.name.endsWith(".log")) continue;
          logFiles.push(logFile);
        }

        const windowStart = getWindowStart(daysToLoad);
        const windowEnd = new Date();
        windowEnd.setHours(23, 59, 59, 999);

        const logFilesInWindow = windowStart
          ? logFiles.filter(
              ({ file }) =>
                file.lastModified >= windowStart.getTime() &&
                file.lastModified <= windowEnd.getTime(),
            )
          : logFiles;

        const isFullRead = requiresFullReadRef.current;
        requiresFullReadRef.current = false;

        try {
          const rawMatches = await parseLogFiles(logFilesInWindow, isFullRead);

          /**
           * Map raw matches to `IEntry` on the main thread (needed for JSX rendering)
           */
          setEntries((previousEntries) => {
            const newEntries = new Map<string, IEntry>(previousEntries);

            for (const rawMatch of rawMatches) {
              const isoDate = new Date(rawMatch.isoDate);
              const key = createEntryKey(rawMatch.type, rawMatch.fullMatch);
              const existingEntry = newEntries.get(key);
              /**
               * A local entry replaces a shared one of the same line, because
               * it belongs to the user and not to whoever shared it first. It
               * keeps the highlight state of the entry it replaces.
               */
              if (existingEntry && !existingEntry.isShared) continue;

              newEntries.set(key, {
                key,
                type: rawMatch.type,
                isoDate,
                isNew: existingEntry?.isNew ?? isNew,
                ...deriveEntryFields(rawMatch.type, rawMatch.groups),
                citizen: ownCitizen,
                isShared: false,
                isUploaded: false,
              });
            }

            /** A file of the window can begin before the window */
            deleteEntriesBefore(newEntries, windowStart);

            return newEntries;
          });

          /**
           * Sharing must not hold up the rendering of the new entries. A
           * failed upload tries again with the whole window next cycle.
           */
          void uploadEntries(rawMatches).then(
            (isComplete) => {
              if (!isComplete) requiresFullReadRef.current = true;
            },
            () => {
              requiresFullReadRef.current = true;
            },
          );
        } catch (error) {
          requiresFullReadRef.current = true;
          console.error("[Log Analyzer] Error reading files:", error);
        }
      });
    },
    [
      authentication,
      daysToLoad,
      ownEntryTypes,
      isAutostartEnabled,
      isLiveModeEnabled,
      ownCitizen,
      parseLogFiles,
      pipWindow,
      setEntries,
      startTransition,
      uploadEntries,
    ],
  );

  const openDirectory = useCallback(
    (directoryHandle: FileSystemDirectoryHandle) => {
      directoryHandleRef.current = directoryHandle;
      requiresFullReadRef.current = true;
      parseLogs();
    },
    [parseLogs],
  );

  /**
   * The interval reads the newest `parseLogs` from a ref. Reading it from the
   * dependencies instead would restart the interval on every render — and
   * every arrival of shared entries causes one.
   */
  const parseLogsRef = useRef(parseLogs);
  useEffect(() => {
    parseLogsRef.current = parseLogs;
  }, [parseLogs]);

  useEffect(() => {
    if (!isLiveModeEnabled) return;

    const interval = window.setInterval(() => {
      parseLogsRef.current(true);
    }, LIVE_MODE_PARSE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isLiveModeEnabled]);

  const handlePreviousDirectorySelect = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();

      get("directory_handle")
        .then(
          async (
            existingDirectoryHandle: FileSystemDirectoryHandle | undefined,
          ) => {
            if (existingDirectoryHandle) {
              const permissionState =
                await existingDirectoryHandle.requestPermission();
              if (permissionState === "granted") {
                openDirectory(existingDirectoryHandle);
                return;
              }
            }

            const newDirectoryHandle = await window.showDirectoryPicker();
            if (!newDirectoryHandle) return;
            openDirectory(newDirectoryHandle);
            await set("directory_handle", newDirectoryHandle);
          },
        )
        .catch((error) => {
          console.error(
            "[Log Analyzer] Error retrieving or selecting directory handle:",
            error,
          );
        });
    },
    [openDirectory],
  );

  const handleNewDirectorySelect = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();

    window
      .showDirectoryPicker()
      .then(async (newDirectoryHandle) => {
        if (!newDirectoryHandle) return;
        openDirectory(newDirectoryHandle);
        await set("directory_handle", newDirectoryHandle);
      })
      .catch((error) => {
        console.error("[Log Analyzer] Error selecting directory:", error);
      });
  };

  /**
   * The ref makes sure enabling autostart triggers the directory selection
   * exactly once, even when `handlePreviousDirectorySelect` changes identity.
   */
  const autostartTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isAutostartEnabled) {
      autostartTriggeredRef.current = false;
      return;
    }
    if (autostartTriggeredRef.current) return;

    autostartTriggeredRef.current = true;
    handlePreviousDirectorySelect();
  }, [isAutostartEnabled, handlePreviousDirectorySelect]);

  const handleRefresh = useCallback(() => {
    parseLogs(true);
    refreshSharedEntries();
  }, [parseLogs, refreshSharedEntries]);

  return (
    <div className={clsx(className)}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-baseline justify-end">
        <div>
          <Button2
            type="button"
            onClick={handleNewDirectorySelect}
            disabled={isPending}
            className="lg:ml-auto"
          >
            {isPending ? <AsciiSpinner /> : <FaFileArrowUp />}
            Ordner auswählen
          </Button2>

          <Button
            type="button"
            onClick={handlePreviousDirectorySelect}
            variant="tertiary"
            disabled={isPending}
            className="lg:ml-auto"
          >
            Letzten Ordner verwenden
          </Button>
        </div>
      </div>

      {/* The toolbar also holds the sharing settings, thus it stays reachable
          before a folder is chosen — the shared entries need no folder. */}
      <Toolbar onRefresh={handleRefresh} className="mt-1" />

      {entries.size > 0 ? (
        <LogAnalyzerTable className="mt-0.5" />
      ) : (
        <Introduction className="mt-1" />
      )}
    </div>
  );
};
