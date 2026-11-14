"use client";

import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { useNow } from "next-intl";
import { useId } from "react";
import { FaInfoCircle } from "react-icons/fa";
import {
  evaluateLiveStatus,
  trackLiveStatus,
  type LiveStatusReporter as Reporter,
} from "../utils/liveStatus";
import { LiveStatusReporter } from "./LiveStatusReporter";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

/**
 * The panel shows durations in minutes, and its shortest timeout is 10
 * minutes. Thus a tick of 30 seconds is precise enough.
 */
const CLOCK_INTERVAL_MS = 30_000;

interface Props {
  readonly className?: string;
}

/**
 * The current states of the reporters which the filters show. The states use
 * all entries in memory, of all types, so that a hidden type does not keep a
 * state open (see `trackLiveStatus`).
 */
export const LiveStatus = ({ className }: Props) => {
  const {
    entries,
    ownEntryTypes,
    isSharedViewEnabled,
    hiddenCitizenIds,
    ownLogLineAt,
    isLiveModeActive,
    isLivePaused,
  } = useLogAnalyzerContext();
  const now = useNow({ updateInterval: CLOCK_INTERVAL_MS });
  const headingId = useId();

  /** The React Compiler repeats this only when the entries change */
  const trackedReporters = trackLiveStatus(entries.values());

  const isOwnReporterVisible = Object.values(ownEntryTypes).some(Boolean);
  const isReporterVisible = (reporter: Reporter) => {
    if (reporter.isOwn) return isOwnReporterVisible;
    return (
      isSharedViewEnabled &&
      reporter.citizen !== null &&
      !hiddenCitizenIds.includes(reporter.citizen.id)
    );
  };

  const reporters = evaluateLiveStatus(trackedReporters, {
    now,
    ownLogLineAt,
    isLiveModeActive,
  }).filter(isReporterVisible);

  return (
    <section
      aria-labelledby={headingId}
      className={clsx("rounded-primary bg-secondary p-4", className)}
    >
      <h2 id={headingId} className="flex items-center gap-2 font-bold">
        Live-Status
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
      ) : reporters.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {reporters.map((reporter) => (
            <LiveStatusReporter
              key={reporter.key}
              reporter={reporter}
              now={now}
              isLiveModeActive={isLiveModeActive}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/60">Gerade ist niemand aktiv.</p>
      )}
    </section>
  );
};
