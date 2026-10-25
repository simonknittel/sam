"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useTabsContext } from "@/modules/common/components/tabs/TabsContext";
import { api } from "@/trpc/react";
import { OnSiteNotificationTab } from "@sam-monorepo/domain";
import clsx from "clsx";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
import type { OnSiteNotificationRow } from "../utils/types";
import { NotificationListItem } from "./NotificationListItem";

interface Props {
  readonly tab: OnSiteNotificationTab;
  readonly onNavigate?: () => void;
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

export const NotificationList = ({ tab, onNavigate }: Props) => {
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
      enabled: isActive,
    },
  );
  const { markRead, markUnread, archive, unarchive } =
    useOnSiteNotificationMutations();

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  const handleNavigateToTarget = (notification: OnSiteNotificationRow) => {
    if (!notification.readAt)
      void markRead(notification, { successToast: false });
    onNavigate?.();
  };

  if (isPending)
    return (
      <p
        className={clsx(
          statusMessageClassName,
          "animate-pulse font-mono text-sm",
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
      <p className={clsx(statusMessageClassName, "text-sm text-neutral-500")}>
        {tab === OnSiteNotificationTab.Inbox
          ? "Keine Benachrichtigungen"
          : "Keine archivierten Benachrichtigungen"}
      </p>
    );

  return (
    <ul className="-mx-4 -mb-4 max-h-96 divide-y divide-neutral-800 overflow-y-auto border-t border-neutral-800">
      {notifications.map((notification) => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          tab={tab}
          onMarkRead={markRead}
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
            className="w-full p-3 text-center font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:scale-95 enabled:cursor-pointer disabled:opacity-50"
          >
            {isFetchingNextPage ? "Wird geladen..." : "Mehr laden"}
          </button>
        </li>
      )}
    </ul>
  );
};
