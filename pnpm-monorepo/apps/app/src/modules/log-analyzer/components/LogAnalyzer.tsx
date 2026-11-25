"use client";

import clsx from "clsx";
import { DateRangeSettings } from "./DateRangeSettings";
import { FeedNotes } from "./FeedNotes";
import { LiveStatus } from "./LiveStatus";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { LogAnalyzerTable } from "./LogAnalyzerTable";
import { LogFolderNote } from "./LogFolderNote";
import { OlderEntriesButton } from "./OlderEntriesButton";
import { QuickLookBar } from "./QuickLookBar";
import { ReadStatus } from "./ReadStatus";
import { Toolbar } from "./Toolbar";

interface Props {
  readonly className?: string;
}

/**
 * The control UI of the feed `log_entries` (see "Log Analyzer" of
 * `docs/remote-control-program/README.md`). The browser runtime reads the
 * log folder, and the sharing popover holds the settings of the sharing.
 */
export const LogAnalyzer = ({ className }: Props) => {
  const { entries, isLiveStatusVisible } = useLogAnalyzerContext();

  return (
    <div className={clsx(className)}>
      {/* The notes render nothing while all is well */}
      <div className="mb-1 flex flex-col gap-1 empty:hidden">
        <LogFolderNote />
        <FeedNotes />
      </div>

      <Toolbar>
        <DateRangeSettings />
        <OlderEntriesButton />
        <ReadStatus />
      </Toolbar>

      <QuickLookBar className="mt-0.5" />

      {entries.length > 0 ? (
        /*
         * Below `2xl`, three quarters of the width are less than the minimum
         * width of the table, thus the Live-Status moves above the table.
         */
        <div
          className={clsx("mt-0.5 flex flex-col gap-0.5", {
            "2xl:grid 2xl:grid-cols-[3fr_1fr] 2xl:items-start":
              isLiveStatusVisible,
          })}
        >
          {isLiveStatusVisible && <LiveStatus className="2xl:order-2" />}
          <LogAnalyzerTable className="min-w-0 2xl:order-1" />
        </div>
      ) : (
        <p className="mt-1 rounded-primary border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
          Noch keine Einträge in diesem Zeitraum.
        </p>
      )}
    </div>
  );
};
