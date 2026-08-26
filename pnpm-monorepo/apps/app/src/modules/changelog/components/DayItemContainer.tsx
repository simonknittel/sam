"use client";

import { SmallBadge } from "@/modules/common/components/SmallBadge";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useUnseenEntries } from "./UnseenEntriesProvider";

interface Props {
  readonly entryKey: string;
  /** Untracked entries never carry a "Neu" indicator and are not observed */
  readonly isTracked: boolean;
  readonly isUnseenOnServer: boolean;
  /**
   * A redacted entry is still marked as seen once it has been scrolled past,
   * so its dot badge clears, but it never reveals that it is new.
   */
  readonly isRedacted?: boolean;
  readonly title: string;
  readonly tags?: string[];
  readonly children: ReactNode;
}

export const DayItemContainer = ({
  entryKey,
  isTracked,
  isUnseenOnServer,
  isRedacted = false,
  title,
  tags,
  children,
}: Props) => {
  const { retainedHighlightKeys, observeEntry } = useUnseenEntries();

  const isRetained = retainedHighlightKeys.has(entryKey);
  const isUnseen = isTracked && isUnseenOnServer && !isRetained;
  const showsNewIndicator =
    !isRedacted && isTracked && (isUnseenOnServer || isRetained);

  return (
    <li
      ref={isUnseen ? observeEntry : undefined}
      data-read-on-view-id={isUnseen ? entryKey : undefined}
      className={clsx("pl-5 relative", {
        "border-l-2 border-neutral-800/80 py-3 pr-3": isRedacted,
        "border-l border-l-transparent": !isRedacted && showsNewIndicator,
        "border-l border-l-neutral-800/80": !isRedacted && !showsNewIndicator,
      })}
    >
      {showsNewIndicator && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px"
          style={{
            background: "linear-gradient(to bottom, #f59e0b, transparent)",
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <strong className="block font-bold font-mono uppercase">{title}</strong>

        {showsNewIndicator && (
          /** Marks the indicator independently of the classes drawing it */
          <div
            data-new-changelog-entry=""
            className="bg-amber-500 text-black font-mono uppercase text-xs px-1 py-0.5"
          >
            Neu
          </div>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((tag) => (
            <SmallBadge key={tag} value={tag} />
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </li>
  );
};
