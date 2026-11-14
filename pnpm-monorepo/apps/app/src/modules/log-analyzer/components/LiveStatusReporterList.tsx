"use client";

import clsx from "clsx";
import { useNow } from "next-intl";
import {
  evaluateLiveStatus,
  type LiveStatusReporter as Reporter,
  type TrackedReporter,
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
  readonly trackedReporters: readonly TrackedReporter[];
}

/** The reporters at the current time, see `evaluateLiveStatus` */
export const LiveStatusReporterList = ({
  className,
  trackedReporters,
}: Props) => {
  const {
    ownEntryTypes,
    isSharedViewEnabled,
    hiddenCitizenIds,
    ownLogLineAt,
    isLiveModeActive,
  } = useLogAnalyzerContext();
  const now = useNow({ updateInterval: CLOCK_INTERVAL_MS });

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

  if (reporters.length <= 0)
    return (
      <p className={clsx("text-sm text-white/60", className)}>
        Gerade ist niemand aktiv.
      </p>
    );

  return (
    <ul className={clsx("flex flex-col gap-2", className)}>
      {reporters.map((reporter) => (
        <LiveStatusReporter
          key={reporter.key}
          reporter={reporter}
          now={now}
          isLiveModeActive={isLiveModeActive}
        />
      ))}
    </ul>
  );
};
