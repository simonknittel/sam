"use client";

import { Link } from "@/modules/common/components/Link";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { UnreadEdge } from "@/modules/common/components/UnreadEdge";
import type { ReadOnViewRef } from "@/modules/common/utils/useReadOnView";
import type { ComponentType } from "react";
import { FaArchive, FaEnvelope, FaUndo } from "react-icons/fa";
import {
  NotificationDecoration,
  renderOnSiteNotification,
} from "../utils/renderOnSiteNotification";
import {
  NotificationCenterTab,
  type OnSiteNotificationRow,
} from "../utils/types";
import { BirthdayDecoration } from "./BirthdayDecoration";
import { NewYearDecoration } from "./NewYearDecoration";

/**
 * What a decorated row draws behind its text. The record is total, thus a
 * new decoration cannot stay without a component.
 */
const decorationComponents: Record<NotificationDecoration, ComponentType> = {
  [NotificationDecoration.Birthday]: BirthdayDecoration,
  [NotificationDecoration.NewYear]: NewYearDecoration,
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
      text. Without it, the negative z-index of the decoration would put it
      behind the background of the popover. */
      className="group/notification relative isolate px-4 py-2 focus-within:bg-neutral-800/50 hover:bg-neutral-800/50"
      data-read-on-view-id={trackReadOnView ? notification.id : undefined}
    >
      {Decoration && <Decoration />}

      {showsUnreadHighlight && <UnreadEdge title="Ungelesen" />}

      <div className="flex items-center gap-2">
        {rendering.url ? (
          <Link
            href={rendering.url}
            onClick={() => onNavigateToTarget(notification.id, isUnread)}
            className="truncate text-sm font-bold after:absolute after:inset-0 hover:underline focus-visible:underline"
            title={rendering.title}
          >
            {rendering.title}
          </Link>
        ) : (
          <span className="truncate text-sm font-bold" title={rendering.title}>
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
        <p className="mt-0.5 text-sm wrap-break-word text-neutral-300">
          {rendering.body}
        </p>
      )}

      <div className="mt-0.5 flex min-h-6 items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-neutral-500 uppercase">
          {rendering.appTitle}
        </span>

        <div className="relative flex gap-1 opacity-0 group-focus-within/notification:opacity-100 group-hover/notification:opacity-100">
          {tab === NotificationCenterTab.Inbox && (
            <>
              {!isUnread && (
                <button
                  type="button"
                  onClick={() => onMarkUnread(notification)}
                  title="Als ungelesen markieren"
                  aria-label="Als ungelesen markieren"
                  className="cursor-pointer p-1 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
                >
                  <FaEnvelope />
                </button>
              )}

              <button
                type="button"
                onClick={() => onArchive(notification)}
                title="Archivieren"
                aria-label="Archivieren"
                className="cursor-pointer p-1 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
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
              className="cursor-pointer p-1 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
            >
              <FaUndo />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
