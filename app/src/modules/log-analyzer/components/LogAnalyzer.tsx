/// <reference types="@types/wicg-file-system-access" />

"use client";

import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { Table, TBody, THead } from "@/modules/common/components/Table";
import { useLocalStorage } from "@uidotdev/usehooks";
import clsx from "clsx";
import { get, set } from "idb-keyval";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { FaSpinner } from "react-icons/fa";
import { FaFileArrowUp } from "react-icons/fa6";
import { getFilesRecursively } from "../utils/getFilesRecursively";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import type { RawMatch, ResultMessage } from "../utils/types";
import { Entry } from "./Entry";
import { useEntryFilterContext } from "./EntryFilterContext";
import { Introduction } from "./Introduction";
import { Toolbar } from "./Toolbar";

const TABLE_MIN_WIDTH = "min-w-80";
export const GRID_COLS = "grid-cols-[160px_160px_1fr]";

interface Props {
  readonly className?: string;
  readonly crashLogAnalyzer?: boolean;
}

export const LogAnalyzer = ({ className }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [entries, setEntries] = useState<Map<string, IEntry>>(new Map());
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const liveModeIntervalRef = useRef<number | null>(null);
  const [isLiveModeEnabled, setIsLiveModeEnabled] = useLocalStorage(
    "is_live_mode_enabled",
    false,
  );
  const [isAutostartEnabled, setIsAutostartEnabled] = useLocalStorage(
    "is_autostart_enabled",
    false,
  );
  const [daysToLoad] = useLocalStorage<number>("log_analyzer_days_to_load", 14);
  const { entryFilterFn } = useEntryFilterContext();

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
              const pattern =
                PATTERNS[rawMatch.patternKey as keyof typeof PATTERNS];
              if (!pattern) continue;

              const date = new Date(rawMatch.isoDate);
              const entry = pattern.matchMapping(date, rawMatch.groups);
              if (newEntries.has(entry.key)) continue;

              newEntries.set(entry.key, {
                ...entry,
                isoDate: date,
                isNew,
              });
            }

            return newEntries;
          });
        } catch (error) {
          console.error("[Log Analyzer] Error reading files:", error);
        }
      });
    },
    [daysToLoad],
  );

  useEffect(() => {
    if (isLiveModeEnabled) {
      liveModeIntervalRef.current = window.setInterval(() => {
        parseLogs(true);
      }, 10_000);
    } else {
      if (liveModeIntervalRef.current) {
        window.clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
    }

    return () => {
      if (liveModeIntervalRef.current) {
        window.clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
    };
  }, [isLiveModeEnabled, parseLogs]);

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
  };

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

  useEffect(() => {
    if (isAutostartEnabled) {
      handlePreviousDirectorySelect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutostartEnabled]);

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
            {isPending ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaFileArrowUp />
            )}
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

      {entries.size > 0 ? (
        <>
          <Toolbar
            isPending={isPending}
            isLiveModeEnabled={isLiveModeEnabled}
            onToggleLiveMode={setIsLiveModeEnabled}
            isAutostartEnabled={isAutostartEnabled}
            onToggleAutostart={setIsAutostartEnabled}
            onRefresh={() => parseLogs(true)}
            filteredEntries={Array.from(entries.values().filter(entryFilterFn))}
            className="mt-1"
          />

          <div className="mt-0.5 p-4 bg-secondary rounded-primary overflow-auto">
            <Table tableClassName={TABLE_MIN_WIDTH}>
              <THead className={GRID_COLS}>
                <th>Datum</th>
                <th>Typ</th>
                <th>Nachricht</th>
              </THead>

              <TBody className="text-sm">
                {Array.from(entries.values())
                  .toSorted((a, b) => b.isoDate.getTime() - a.isoDate.getTime())
                  .filter(entryFilterFn)
                  .map((entry) => (
                    <Entry key={entry.key} entry={entry} />
                  ))}
              </TBody>
            </Table>
          </div>
        </>
      ) : (
        <Introduction className="mt-1" />
      )}
    </div>
  );
};
