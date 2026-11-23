"use client";

import type { OwnRuntime } from "@sam-monorepo/application";
import { RuntimeListItem } from "./RuntimeListItem";
import { SharingPopoverSection } from "./SharingPopoverSection";
import { StopAllControl } from "./StopAllControl";

interface Props {
  /** The most recent connections first */
  readonly runtimes: readonly OwnRuntime[];
  /** The start of the "Stop all" of the owner, or null */
  readonly stoppedAt: Date | null;
  /** The popover fetches the data again */
  readonly isRefreshing: boolean;
}

/** The section "Status": the runtimes of the owner and the "Stop all" for all of them */
export const StatusSection = ({ runtimes, stoppedAt, isRefreshing }: Props) => {
  return (
    <SharingPopoverSection heading="Status" isRefreshing={isRefreshing}>
      {runtimes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {runtimes.map((runtime) => (
            <RuntimeListItem key={runtime.runtimeId} runtime={runtime} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">
          Bisher war keine Laufzeit verbunden.
        </p>
      )}

      <StopAllControl stoppedAt={stoppedAt} />
    </SharingPopoverSection>
  );
};
