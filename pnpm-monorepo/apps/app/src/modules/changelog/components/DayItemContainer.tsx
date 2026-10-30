"use client";

import { SmallBadge } from "@/modules/common/components/SmallBadge";
import {
  UnreadEdge,
  UnreadEdgeWidth,
} from "@/modules/common/components/UnreadEdge";
import { NewMarkerButton } from "@/modules/read-markers/components/NewMarkerButton";
import { useMarkAsRead } from "@/modules/read-markers/hooks/useMarkAsRead";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useRef, type ReactNode } from "react";
import { useUnseenEntries } from "./UnseenEntriesProvider";

interface Props {
  readonly entryKey: string;
  /** Untracked entries never carry a "Neu" indicator and are not observed */
  readonly isTracked: boolean;
  readonly isUnseenOnServer: boolean;
  /**
   * A redacted entry is still marked as read once it has been scrolled past,
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
  const { retainedHighlightKeys, observeEntry, dismissHighlight } =
    useUnseenEntries();
  const { isNew, markAsRead } = useMarkAsRead(
    ReadMarkerSubject.ChangelogEntry,
    entryKey,
    isTracked && isUnseenOnServer,
  );
  /** The entry has no link, thus its title takes the focus of the marker */
  const titleRef = useRef<HTMLElement>(null);

  const isRetained = retainedHighlightKeys.has(entryKey);
  const isUnseen = isNew && !isRetained;
  const showsNewIndicator = !isRedacted && (isNew || isRetained);

  const handleNewMarkerClick = () => {
    titleRef.current?.focus();
    dismissHighlight(entryKey);
    // Without `isNew`, only the retained highlight shows: the entry is read
    if (isNew) markAsRead();
  };

  return (
    <li
      ref={isUnseen ? observeEntry : undefined}
      data-read-on-view-id={isUnseen ? entryKey : undefined}
      className={clsx("relative pl-5", {
        "border-l-2 border-neutral-800/80 py-3 pr-3": isRedacted,
        "border-l border-l-transparent": !isRedacted && showsNewIndicator,
        "border-l border-l-neutral-800/80": !isRedacted && !showsNewIndicator,
      })}
    >
      {showsNewIndicator && <UnreadEdge width={UnreadEdgeWidth.Thin} />}

      <div className="flex items-center gap-2">
        <strong
          ref={titleRef}
          tabIndex={-1}
          className="block font-mono font-bold uppercase outline-hidden"
        >
          {title}
        </strong>

        {showsNewIndicator && (
          <NewMarkerButton
            onClick={handleNewMarkerClick}
            className="flex-none"
          />
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <SmallBadge key={tag} value={tag} />
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </li>
  );
};
