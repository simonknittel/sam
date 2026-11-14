"use client";

import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { useId } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { trackLiveStatus } from "../utils/liveStatus";
import { LiveStatusReporterList } from "./LiveStatusReporterList";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

/**
 * The current states of the reporters which the filters show. The states use
 * all entries in memory, of all types, so that a hidden type does not keep a
 * state open (see `trackLiveStatus`).
 */
export const LiveStatus = ({ className }: Props) => {
  const { entries, isLivePaused } = useLogAnalyzerContext();
  const headingId = useId();

  /**
   * The clock of the list renders only the list again, thus this step runs
   * only when the entries change.
   */
  const trackedReporters = trackLiveStatus(entries.values());

  return (
    <section
      aria-labelledby={headingId}
      className={clsx("rounded-primary bg-secondary p-4", className)}
    >
      <h2 id={headingId} className="flex items-center gap-2">
        {/* The style of the column headings of the table. Not on the heading,
            because the tooltip inside it would take the style. */}
        <span className="font-mono text-sm text-white/40 uppercase">
          Live-Status
        </span>
        <Tooltip triggerChildren={<FaInfoCircle />}>
          <p>
            Zeigt, was bei jedem Reporter gerade aktiv ist: Session, Zonen,
            Instanzen, Contracts und Party.
          </p>
          <p className="mt-1">
            Nach einem Absturz oder bei nicht geteilten Typen können Log-Zeilen
            fehlen. Ein Zustand ohne neue Zeile wird daher erst als
            &bdquo;unsicher&ldquo; markiert und verschwindet später.
          </p>
        </Tooltip>
      </h2>

      {isLivePaused ? (
        <p className="mt-2 text-sm text-white/60">
          Der Live-Status zeigt nur den aktuellen Stand und ist für einen
          vergangenen Zeitraum ausgeblendet.
        </p>
      ) : (
        <LiveStatusReporterList
          trackedReporters={trackedReporters}
          className="mt-2"
        />
      )}
    </section>
  );
};
