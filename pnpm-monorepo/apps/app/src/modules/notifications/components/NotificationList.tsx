"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useTabsContext } from "@/modules/common/components/tabs/TabsContext";
import { useReadOnView } from "@/modules/common/utils/useReadOnView";
import { api } from "@/trpc/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
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
   * Read-on-view marks an unread notification read once it has dwelled in the
   * scroll container, and retains its highlight so the user doesn't lose
   * track of what is new while the popover is still open. Only enabled once
   * the list is rendered, because the observer needs the scroll container as
   * its root.
   */
  const handleRead = useCallback((notificationIds: string[]) => {
    onRetainHighlightsRef.current?.(notificationIds);
    void markReadRef.current(notificationIds);
  }, []);

  const observeNotification = useReadOnView({
    enabled:
      isActive &&
      tab === NotificationCenterTab.Inbox &&
      notifications.length > 0,
    rootRef: scrollContainerRef,
    onRead: handleRead,
  });

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
          observeReadOnView={observeNotification}
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
