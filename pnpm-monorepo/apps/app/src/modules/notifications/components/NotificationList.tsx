"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useTabsContext } from "@/modules/common/components/tabs/TabsContext";
import { api } from "@/trpc/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
import {
  READ_ON_VIEW_DWELL_MILLISECONDS,
  READ_ON_VIEW_FLUSH_DEBOUNCE_MILLISECONDS,
  READ_ON_VIEW_VISIBILITY_THRESHOLD,
} from "../utils/config";
import { NotificationCenterTab } from "../utils/types";
import { NotificationListItem } from "./NotificationListItem";

interface Props {
  readonly tab: NotificationCenterTab;
  readonly onNavigate?: () => void;
  /** Notifications which keep their unread highlight although already read */
  readonly retainedHighlightIds?: ReadonlySet<string>;
  /** Called with the ids read-on-view marks read, to retain their highlight */
  readonly onRetainHighlights?: (notificationIds: string[]) => void;
}

/**
 * Mirrors the footprint of the notification list showing a single
 * `NotificationListItem` with a body line: the same edge bleed and top border
 * as the `ul` below, and `min-h-21` (84px) matching the item's height (`py-2`
 * plus title, body and action rows). `box-content` makes the top border add to
 * the min-height like the list's border does. This keeps the popover height
 * identical across the loading, error, empty and single-notification states.
 */
const statusMessageClassName =
  "-mx-4 -mb-4 border-t border-neutral-800 box-content min-h-21 px-4 flex gap-2 justify-center items-center text-center";

export const NotificationList = ({
  tab,
  onNavigate,
  retainedHighlightIds,
  onRetainHighlights,
}: Props) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === tab;
  const {
    isPending,
    data,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = api.onSiteNotifications.list.useInfiniteQuery(
    { tab },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isActive,
    },
  );
  const { markRead, markUnread, archive, unarchive } =
    useOnSiteNotificationMutations();

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  const scrollContainerRef = useRef<HTMLUListElement>(null);

  const markReadRef = useRef(markRead);
  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  const onRetainHighlightsRef = useRef(onRetainHighlights);
  useEffect(() => {
    onRetainHighlightsRef.current = onRetainHighlights;
  }, [onRetainHighlights]);

  /**
   * Read-on-view: an unread notification which stays sufficiently visible in
   * the scroll container for the dwell time is collected, and collected ids
   * are flushed as one batched mark-read call which also retains their
   * highlight. Pending ids survive closing the popover (flush on cleanup);
   * pending dwell timers do not.
   */
  const notificationIds = notifications.map((item) => item.id).join(",");
  useEffect(() => {
    if (!isActive || tab !== NotificationCenterTab.Inbox) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const dwellTimers = new Map<string, number>();
    const pendingReadIds = new Set<string>();
    let flushTimer: number | null = null;

    const flush = () => {
      if (pendingReadIds.size <= 0) return;
      const idsToMark = Array.from(pendingReadIds);
      pendingReadIds.clear();
      onRetainHighlightsRef.current?.(idsToMark);
      void markReadRef.current(idsToMark);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const notificationId = (entry.target as HTMLElement).dataset
            .unreadNotificationId;
          if (!notificationId) continue;

          if (entry.intersectionRatio >= READ_ON_VIEW_VISIBILITY_THRESHOLD) {
            if (dwellTimers.has(notificationId)) continue;
            dwellTimers.set(
              notificationId,
              window.setTimeout(() => {
                dwellTimers.delete(notificationId);
                observer.unobserve(entry.target);
                pendingReadIds.add(notificationId);
                if (flushTimer !== null) window.clearTimeout(flushTimer);
                flushTimer = window.setTimeout(
                  flush,
                  READ_ON_VIEW_FLUSH_DEBOUNCE_MILLISECONDS,
                );
              }, READ_ON_VIEW_DWELL_MILLISECONDS),
            );
          } else {
            const dwellTimer = dwellTimers.get(notificationId);
            if (dwellTimer !== undefined) {
              window.clearTimeout(dwellTimer);
              dwellTimers.delete(notificationId);
            }
          }
        }
      },
      {
        root: scrollContainer,
        threshold: READ_ON_VIEW_VISIBILITY_THRESHOLD,
      },
    );

    for (const element of scrollContainer.querySelectorAll(
      "[data-unread-notification-id]",
    )) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
      for (const dwellTimer of dwellTimers.values()) {
        window.clearTimeout(dwellTimer);
      }
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      flush();
    };
  }, [isActive, tab, notificationIds]);

  const handleNavigateToTarget = useCallback(
    (notificationId: string, isUnread: boolean) => {
      if (isUnread) void markReadRef.current([notificationId]);
      onNavigate?.();
    },
    [onNavigate],
  );

  if (isPending)
    return (
      <p
        className={clsx(
          statusMessageClassName,
          "font-mono text-sm animate-pulse",
        )}
      >
        <AsciiSpinner />
        Benachrichtigungen werden geladen...
      </p>
    );

  if (error)
    return (
      <p
        className={clsx(
          statusMessageClassName,
          "font-mono text-sm text-red-500",
        )}
      >
        <BsExclamationOctagonFill className="text-red-800" />
        Fehler beim Laden der Benachrichtigungen
      </p>
    );

  if (notifications.length <= 0)
    return (
      <p className={clsx(statusMessageClassName, "text-neutral-500 text-sm")}>
        {tab === NotificationCenterTab.Inbox
          ? "Keine Benachrichtigungen"
          : "Keine archivierten Benachrichtigungen"}
      </p>
    );

  return (
    <ul
      ref={scrollContainerRef}
      className="max-h-96 overflow-y-auto -mx-4 -mb-4 divide-y divide-neutral-800 border-t border-neutral-800"
    >
      {notifications.map((notification) => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          tab={tab}
          keepUnreadHighlight={
            retainedHighlightIds?.has(notification.id) ?? false
          }
          onArchive={archive}
          onUnarchive={unarchive}
          onMarkUnread={markUnread}
          onNavigateToTarget={handleNavigateToTarget}
        />
      ))}

      {hasNextPage && (
        <li>
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full text-center text-interaction-500 hover:underline focus-visible:underline active:scale-95 text-sm p-3 font-mono uppercase enabled:cursor-pointer disabled:opacity-50"
          >
            {isFetchingNextPage ? "Wird geladen..." : "Mehr laden"}
          </button>
        </li>
      )}
    </ul>
  );
};
