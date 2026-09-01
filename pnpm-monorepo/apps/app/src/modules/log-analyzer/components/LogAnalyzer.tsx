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
import { useSharedEntries } from "../hooks/useSharedEntries";
import { getFilesRecursively } from "../utils/getFilesRecursively";
import { LIVE_MODE_INTERVAL_MS } from "../utils/liveMode";
import {
  createEntryKey,
  EntryType,
  PATTERNS,
  type IEntry,
} from "../utils/PATTERNS";
import type { RawMatch, ResultMessage } from "../utils/types";
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
    entryFilters,
    entries,
    setEntries,
  } = useLogAnalyzerContext();

  const authentication = useAuthentication();
  const { pipWindow } = useOverlay();
  const uploadEntries = useEntryUpload();
  const refreshSharedEntries = useSharedEntries();

  const ownCitizen = authentication ? authentication.session.entity : null;

  // Reusable Web Worker for background log parsing
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../utils/logParser.worker.ts", import.meta.url),
      { type: "module" },
    );
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const parseLogs = useCallback(
    (isNew = false) => {
      startTransition(async () => {
        if (!directoryHandleRef.current) return;
        if (!workerRef.current) return;

        try {
          const filterProps = Object.fromEntries(
            Object.values(EntryType).map((type) => [
              `log_analyzer_filter_${type}`,
              !entryFilters[type],
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

        const files: File[] = [];

        for await (const fileHandle of getFilesRecursively(
          directoryHandleRef.current,
        )) {
          if (!fileHandle) continue;
          if (!fileHandle.name.endsWith(".log")) continue;
          files.push(fileHandle);
        }

        const cutoffDateEnd = new Date();
        cutoffDateEnd.setHours(23, 59, 59, 999);

        const slicedFiles =
          daysToLoad === 0
            ? files
            : files.filter((file) => {
                const cutoffDateStart = new Date(cutoffDateEnd);
                cutoffDateStart.setDate(cutoffDateStart.getDate() - daysToLoad);
                cutoffDateStart.setHours(0, 0, 0, 0);
                const lastModified = new Date(file.lastModified);
                return (
                  lastModified >= cutoffDateStart &&
                  lastModified <= cutoffDateEnd
                );
              });

        try {
          const fileContents = await Promise.all(
            slicedFiles.map((file: File) => file.text()),
          );

          /**
           * Offload RegEx matching to Web Worker
           */
          const rawMatches = await new Promise<RawMatch[]>(
            (resolve, reject) => {
              const worker = workerRef.current!;

              const handleMessage = (e: MessageEvent<ResultMessage>) => {
                worker.removeEventListener("message", handleMessage);
                resolve(e.data.matches);
              };
              worker.addEventListener("message", handleMessage);

              worker.addEventListener("error", (e: ErrorEvent) => {
                worker.removeEventListener("message", handleMessage);
                reject(new Error(e.message));
              });

              worker.postMessage({
                id: Date.now(),
                fileContents,
              });
            },
          );

          /**
           * Map raw matches to `IEntry` on the main thread (needed for JSX rendering)
           */
          setEntries((previousEntries) => {
            const newEntries = new Map<string, IEntry>(previousEntries);

            for (const rawMatch of rawMatches) {
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
                isoDate: new Date(rawMatch.isoDate),
                isNew: existingEntry?.isNew ?? isNew,
                message:
                  PATTERNS[rawMatch.type].renderMessage?.(rawMatch.groups) ??
                  null,
                citizen: ownCitizen,
                isShared: false,
              });
            }

            return newEntries;
          });

          /** Sharing must not hold up the rendering of the new entries */
          void uploadEntries(rawMatches);
        } catch (error) {
          console.error("[Log Analyzer] Error reading files:", error);
        }
      });
    },
    [
      authentication,
      daysToLoad,
      entryFilters,
      isAutostartEnabled,
      isLiveModeEnabled,
      ownCitizen,
      pipWindow,
      setEntries,
      startTransition,
      uploadEntries,
    ],
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
    }, LIVE_MODE_INTERVAL_MS);

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
                directoryHandleRef.current = existingDirectoryHandle;
                parseLogs();
                return;
              }
            }

            const newDirectoryHandle = await window.showDirectoryPicker();
            if (!newDirectoryHandle) return;
            directoryHandleRef.current = newDirectoryHandle;
            parseLogs();
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
    [parseLogs],
  );

  const handleNewDirectorySelect = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();

    window
      .showDirectoryPicker()
      .then(async (newDirectoryHandle) => {
        if (!newDirectoryHandle) return;
        directoryHandleRef.current = newDirectoryHandle;
        parseLogs();
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
