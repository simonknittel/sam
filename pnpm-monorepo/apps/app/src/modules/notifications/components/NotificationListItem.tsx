"use client";

import { Link } from "@/modules/common/components/Link";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import type { ReadOnViewRef } from "@/modules/common/utils/useReadOnView";
import { FaArchive, FaEnvelope, FaUndo } from "react-icons/fa";
import {
  NotificationDecoration,
  renderOnSiteNotification,
} from "../utils/renderOnSiteNotification";
import {
  NotificationCenterTab,
  type OnSiteNotificationRow,
} from "../utils/types";
import { BirthdayConfetti } from "./BirthdayConfetti";

/** The effect a decorated row draws behind its text */
const decorationComponents = {
  [NotificationDecoration.Confetti]: BirthdayConfetti,
};

interface Props {
  readonly notification: OnSiteNotificationRow;
  readonly tab: NotificationCenterTab;
  /**
   * Keeps the unread highlight visible although the notification is already
   * read — read-on-view marks notifications read while the popover is open,
   * but their highlight should only disappear once the popover closes.
   */
  readonly keepUnreadHighlight: boolean;
  /** Registers unread rows for the read-on-view tracking of the list */
  readonly observeReadOnView: ReadOnViewRef;
  readonly onArchive: (notification: OnSiteNotificationRow) => void;
  readonly onUnarchive: (notification: OnSiteNotificationRow) => void;
  readonly onMarkUnread: (notification: OnSiteNotificationRow) => void;
  readonly onNavigateToTarget: (
    notificationId: string,
    isUnread: boolean,
  ) => void;
}

export const NotificationListItem = ({
  notification,
  tab,
  keepUnreadHighlight,
  observeReadOnView,
  onArchive,
  onUnarchive,
  onMarkUnread,
  onNavigateToTarget,
}: Props) => {
  const rendering = renderOnSiteNotification(notification);
  const isUnread = !notification.readAt;
  const showsUnreadHighlight = isUnread || keepUnreadHighlight;
  const trackReadOnView = isUnread && tab === NotificationCenterTab.Inbox;
  const Decoration = rendering.decoration
    ? decorationComponents[rendering.decoration]
    : null;

  return (
    <li
      ref={trackReadOnView ? observeReadOnView : undefined}
      /* `isolate` keeps the decoration between the row's background and its
      text, where a negative z-index of an unisolated row would drop it
      behind the popover. */
      className="relative isolate group/notification px-4 py-2 hover:bg-neutral-800/50 focus-within:bg-neutral-800/50"
      data-read-on-view-id={trackReadOnView ? notification.id : undefined}
    >
      {Decoration && <Decoration />}

      {showsUnreadHighlight && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{
            background: "linear-gradient(to bottom, #f59e0b, transparent)",
          }}
          title="Ungelesen"
        />
      )}

      <div className="flex items-center gap-2">
        {rendering.url ? (
          <Link
            href={rendering.url}
            onClick={() => onNavigateToTarget(notification.id, isUnread)}
            className="font-bold text-sm truncate hover:underline focus-visible:underline after:absolute after:inset-0"
            title={rendering.title}
          >
            {rendering.title}
          </Link>
        ) : (
          <span className="font-bold text-sm truncate" title={rendering.title}>
            {rendering.title}
          </span>
        )}

        {/* Positioned so it sits above the link's full-item overlay and its
        absolute-date tooltip stays reachable. */}
        <RelativeDate
          date={notification.createdAt}
          className="relative ml-auto flex-none text-xs text-neutral-500"
        />
      </div>

      {rendering.body && (
        <p
          className="text-sm text-neutral-300 truncate mt-0.5"
          title={rendering.body}
        >
          {rendering.body}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-0.5 min-h-6">
        <span className="text-xs text-neutral-500 font-mono uppercase truncate">
          {rendering.appTitle}
        </span>

        <div className="relative flex gap-1 opacity-0 group-hover/notification:opacity-100 group-focus-within/notification:opacity-100">
          {tab === NotificationCenterTab.Inbox && (
            <>
              {!isUnread && (
                <button
                  type="button"
                  onClick={() => onMarkUnread(notification)}
                  title="Als ungelesen markieren"
                  aria-label="Als ungelesen markieren"
                  className="p-1 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95 cursor-pointer transition-colors"
                >
                  <FaEnvelope />
                </button>
              )}

              <button
                type="button"
                onClick={() => onArchive(notification)}
                title="Archivieren"
                aria-label="Archivieren"
                className="p-1 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95 cursor-pointer transition-colors"
              >
                <FaArchive />
              </button>
            </>
          )}

          {tab === NotificationCenterTab.Archive && (
            <button
              type="button"
              onClick={() => onUnarchive(notification)}
              title="Wiederherstellen"
              aria-label="Wiederherstellen"
              className="p-1 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95 cursor-pointer transition-colors"
            >
              <FaUndo />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
