"use client";

import type { OwnRuntime } from "@sam-monorepo/application";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { RuntimeListItem } from "./RuntimeListItem";
import { SharingPopoverSection } from "./SharingPopoverSection";
import {
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverTab,
} from "./SharingPopoverTab";

interface Props {
  /** The most recent connections first */
  readonly runtimes: readonly OwnRuntime[];
}

/** The connected runtimes of the owner */
export const StatusSection = ({ runtimes }: Props) => {
  const ownRuntimeId = useBrowserRuntime()?.state.runtimeId ?? null;

  return (
    <SharingPopoverSection
      heading={SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Status]}
    >
      {runtimes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {runtimes.map((runtime) => (
            <RuntimeListItem
              key={runtime.runtimeId}
              runtime={runtime}
              isThisBrowser={runtime.runtimeId === ownRuntimeId}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">
          Gerade ist keine Runtime verbunden.
        </p>
      )}
    </SharingPopoverSection>
  );
};
