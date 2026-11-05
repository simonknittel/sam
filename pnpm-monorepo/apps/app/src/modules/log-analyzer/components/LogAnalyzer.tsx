/// <reference types="@types/wicg-file-system-access" />

"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { track } from "@plausible-analytics/tracker";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import clsx from "clsx";
import { get, set } from "idb-keyval";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { FaFileArrowUp } from "react-icons/fa6";
import { useEntryUpload } from "../hooks/useEntryUpload";
import { useLogParser } from "../hooks/useLogParser";
import { useSharedEntries } from "../hooks/useSharedEntries";
import {
  getEntryWindow,
  getWindowStart,
  hasDateRange,
} from "../utils/entryWindow";
import { getLogFilesRecursively } from "../utils/getLogFilesRecursively";
import { LIVE_MODE_PARSE_INTERVAL_MS } from "../utils/liveMode";
import {
  createEntryKey,
  deriveEntryFields,
  type IEntry,
} from "../utils/PATTERNS";
import {
  selectLogFiles,
  summarizeLogSelection,
  type LogSelection,
} from "../utils/selectLogFiles";
import type { LogFile, ReadProgress } from "../utils/types";
import { Introduction } from "./Introduction";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { LogAnalyzerTable } from "./LogAnalyzerTable";
import { useOverlay } from "./OverlayContext";
import { Toolbar } from "./Toolbar";

const BYTES_PER_MEGABYTE = 1_000_000;
const MILLISECONDS_PER_SECOND = 1_000;

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
    isLivePaused,
    daysToLoad,
    dateRange,
    ownEntryTypes,
    entries,
    setEntries,
  } = useLogAnalyzerContext();

  const authentication = useAuthentication();
  const { pipWindow } = useOverlay();
  const uploadEntries = useEntryUpload();
  const refreshSharedEntries = useSharedEntries();

  const sessionCitizen = authentication ? authentication.session.entity : null;
  /** The signed-in citizen is never a deleted one */
  const ownCitizen = sessionCitizen
    ? { ...sessionCitizen, deletedAt: null }
    : null;

  const { parseLogFiles, stopReads } = useLogParser();

  const [logSelection, setLogSelection] = useState<LogSelection | null>(null);
  const [readProgress, setReadProgress] = useState<ReadProgress | null>(null);

  /** The files of the last walk through the folder, by their path. */
  const knownLogFilesRef = useRef<ReadonlyMap<string, LogFile>>(new Map());

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

  const parseLogs = (isNew = false) => {
    startTransition(async () => {
      if (!directoryHandleRef.current) return;

      try {
        const filterProps = Object.fromEntries(
          Object.values(LogAnalyzerEntryType).map((type) => [
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
            log_analyzer_has_date_range: String(hasDateRange(dateRange)),
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

      const readStartedAt = performance.now();

      const logFiles = (
        await Array.fromAsync(
          getLogFilesRecursively(
            directoryHandleRef.current,
            knownLogFilesRef.current,
          ),
        )
      ).filter((logFile) => logFile !== null);
      knownLogFilesRef.current = new Map(
        logFiles.map((logFile) => [logFile.path, logFile]),
      );

      const logFilesInWindow = await selectLogFiles(
        logFiles,
        getEntryWindow(dateRange, daysToLoad),
      );
      setLogSelection(summarizeLogSelection(logFiles, logFilesInWindow));

      const isFullRead = requiresFullReadRef.current;
      requiresFullReadRef.current = false;

      try {
        const {
          matches: rawMatches,
          readFileCount,
          readByteCount,
        } = await parseLogFiles(logFilesInWindow, isFullRead, setReadProgress);
        setReadProgress(null);

        /** A live read holds one file, and tracks nothing about a large read */
        if (readFileCount > 1) {
          try {
            track("log_analyzer_read_finished", {
              props: {
                log_analyzer_read_files: String(readFileCount),
                log_analyzer_read_megabytes: String(
                  Math.round(readByteCount / BYTES_PER_MEGABYTE),
                ),
                log_analyzer_read_seconds: String(
                  Math.round(
                    (performance.now() - readStartedAt) /
                      MILLISECONDS_PER_SECOND,
                  ),
                ),
              },
              interactive: false,
            });
          } catch {
            // Tracking failure should not affect log parsing
          }
        }

        /**
         * Map raw matches to `IEntry` on the main thread (needed for JSX
         * rendering). A cycle without a match keeps the map, so that the
         * table does not sort all entries again every few seconds.
         */
        if (rawMatches.length > 0) {
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

            return newEntries;
          });
        }

        /**
         * Only the rolling window reaches the server: looking at old logs
         * shares nothing.
         */
        const uploadWindowStart = getWindowStart(daysToLoad);
        const matchesToUpload = uploadWindowStart
          ? rawMatches.filter(
              (rawMatch) => new Date(rawMatch.isoDate) >= uploadWindowStart,
            )
          : rawMatches;

        /**
         * Sharing must not hold up the rendering of the new entries. A
         * failed upload tries again with the whole window next cycle.
         */
        void uploadEntries(matchesToUpload).then(
          (isComplete) => {
            if (!isComplete) requiresFullReadRef.current = true;
          },
          () => {
            requiresFullReadRef.current = true;
          },
        );
      } catch (error) {
        setReadProgress(null);
        requiresFullReadRef.current = true;
        console.error("[Log Analyzer] Error reading files:", error);
      }
    });
  };

  const openDirectory = (directoryHandle: FileSystemDirectoryHandle) => {
    directoryHandleRef.current = directoryHandle;
    knownLogFilesRef.current = new Map();
    requiresFullReadRef.current = true;
    parseLogs();
  };

  /** A large read takes longer than the interval of live mode */
  const parseNewLogLines = useEffectEvent(() => {
    if (!isPending) parseLogs(true);
  });

  const isLiveModeActive = isLiveModeEnabled && !isLivePaused;

  useEffect(() => {
    if (!isLiveModeActive) return;

    const interval = window.setInterval(() => {
      parseNewLogLines();
    }, LIVE_MODE_PARSE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isLiveModeActive]);

  /** A new range needs its files now, not after the read of the last range */
  const parseLogsOfNewDateRange = useEffectEvent(() => {
    stopReads();
    parseLogs();
  });

  useEffect(() => {
    parseLogsOfNewDateRange();
  }, [dateRange]);

  const handlePreviousDirectorySelect = (
    event?: MouseEvent<HTMLButtonElement>,
  ) => {
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
  };

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

  const selectPreviousDirectoryOnAutostart = useEffectEvent(() =>
    handlePreviousDirectorySelect(),
  );

  /**
   * The ref makes sure enabling autostart triggers the directory selection
   * exactly once, also when React runs the effect again (Strict Mode).
   */
  const autostartTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isAutostartEnabled) {
      autostartTriggeredRef.current = false;
      return;
    }
    if (autostartTriggeredRef.current) return;

    autostartTriggeredRef.current = true;
    selectPreviousDirectoryOnAutostart();
  }, [isAutostartEnabled]);

  const handleRefresh = () => {
    parseLogs(true);
    refreshSharedEntries();
  };

  return (
    <div className={clsx(className)}>
      <div className="flex flex-col items-baseline justify-end gap-4 lg:flex-row lg:gap-0">
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
      <Toolbar
        onRefresh={handleRefresh}
        logSelection={logSelection}
        readProgress={readProgress}
        className="mt-1"
      />

      {entries.size > 0 ? (
        <LogAnalyzerTable className="mt-0.5" />
      ) : (
        <Introduction className="mt-1" />
      )}
    </div>
  );
};
