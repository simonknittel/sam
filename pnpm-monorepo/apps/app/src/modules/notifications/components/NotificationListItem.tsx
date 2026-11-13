"use client";

import { Link } from "@/modules/common/components/Link";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { UnreadEdge } from "@/modules/common/components/UnreadEdge";
import { EventInvitationNotificationActions } from "@/modules/events/components/EventInvitationNotificationActions";
import { OnSiteNotificationTab } from "@sam-monorepo/domain";
import clsx from "clsx";
import type { ComponentType } from "react";
import { FaArchive, FaEnvelope, FaEnvelopeOpen, FaUndo } from "react-icons/fa";
import { useNotificationSwipe } from "../hooks/useNotificationSwipe";
import {
  NotificationDecoration,
  renderOnSiteNotification,
} from "../utils/renderOnSiteNotification";
import type { OnSiteNotificationRow } from "../utils/types";
import { BirthdayDecoration } from "./BirthdayDecoration";
import { NewYearDecoration } from "./NewYearDecoration";
import { NotificationSwipeActions } from "./NotificationSwipeActions";
import { WelcomeDecoration } from "./WelcomeDecoration";

/**
 * What a decorated row draws behind its text. The record is total, thus a
 * new decoration cannot stay without a component.
 */
const decorationComponents: Record<NotificationDecoration, ComponentType> = {
  [NotificationDecoration.Birthday]: BirthdayDecoration,
  [NotificationDecoration.NewYear]: NewYearDecoration,
  [NotificationDecoration.Welcome]: WelcomeDecoration,
};

interface Props {
  readonly notification: OnSiteNotificationRow;
  readonly tab: OnSiteNotificationTab;
  readonly onMarkRead: (notification: OnSiteNotificationRow) => void;
  readonly onMarkUnread: (notification: OnSiteNotificationRow) => void;
  readonly onArchive: (notification: OnSiteNotificationRow) => Promise<void>;
  readonly onUnarchive: (notification: OnSiteNotificationRow) => void;
  readonly onNavigateToTarget: (notification: OnSiteNotificationRow) => void;
}

export const NotificationListItem = ({
  notification,
  tab,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onNavigateToTarget,
}: Props) => {
  const rendering = renderOnSiteNotification(notification);
  const isUnread = !notification.readAt;
  const isInbox = tab === OnSiteNotificationTab.Inbox;
  const readToggleLabel = isUnread
    ? "Als gelesen markieren"
    : "Als ungelesen markieren";
  const Decoration = rendering.decoration
    ? decorationComponents[rendering.decoration]
    : null;

  const toggleRead = () => {
    if (isUnread) onMarkRead(notification);
    else onMarkUnread(notification);
  };

  const { swipe, swipeHandlers } = useNotificationSwipe({
    isEnabled: isInbox,
    onSwipeRight: toggleRead,
    onSwipeLeft: () => onArchive(notification),
  });

  return (
    <li
      className={clsx(
        "group/notification relative overflow-x-clip focus-within:bg-neutral-800/50 hover:bg-neutral-800/50",
        /* The browser keeps the vertical scroll, the swipe gets the rest */
        { "touch-pan-y touch-pinch-zoom": isInbox },
      )}
      /* The bottom sheet of the mobile inbox (Base UI drawer) keeps the
      vertical drags and leaves the horizontal drags to the swipe */
      data-base-ui-swipe-ignore={isInbox ? "x" : undefined}
      {...swipeHandlers}
    >
      {isInbox && (
        <NotificationSwipeActions swipe={swipe} isUnread={isUnread} />
      )}

      {/* `isolate` keeps the decoration between the row's background and its
      text. Without it, the negative z-index of the decoration would put it
      behind the background of the popover. The translation applies only
      during a swipe: a transform changes the containing block of fixed
      descendants. */}
      <div
        className={clsx("relative isolate px-4 py-2", {
          "transition-transform duration-200 ease-out motion-reduce:transition-none":
            !swipe.isDragging,
        })}
        style={
          swipe.offset === 0
            ? undefined
            : { transform: `translateX(${swipe.offset}px)` }
        }
      >
        {Decoration && <Decoration />}

        {isUnread && <UnreadEdge title="Ungelesen" />}

        <div className="flex items-center gap-2">
          {rendering.url ? (
            <Link
              href={rendering.url}
              onClick={() => onNavigateToTarget(notification)}
              className="truncate text-sm font-bold after:absolute after:inset-0 hover:underline focus-visible:underline"
              title={rendering.title}
            >
              {rendering.title}
            </Link>
          ) : (
            <span
              className="truncate text-sm font-bold"
              title={rendering.title}
            >
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

        {rendering.eventInvitation && (
          <EventInvitationNotificationActions
            eventId={rendering.eventInvitation.eventId}
            eventName={rendering.eventInvitation.eventName}
            invitationId={rendering.eventInvitation.invitationId}
            onAnswered={() => {
              if (isUnread) onMarkRead(notification);
            }}
          />
        )}

        <div className="mt-0.5 flex min-h-6 items-center justify-between gap-2">
          <span
            className="truncate font-mono text-xs text-neutral-500 uppercase"
            title={rendering.appTitle ?? undefined}
          >
            {rendering.appTitle}
          </span>

          <div className="relative flex gap-1 opacity-0 group-focus-within/notification:opacity-100 group-hover/notification:opacity-100">
            {isInbox && (
              <>
                <button
                  type="button"
                  onClick={toggleRead}
                  title={readToggleLabel}
                  aria-label={readToggleLabel}
                  className="cursor-pointer p-1 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
                >
                  {isUnread ? <FaEnvelopeOpen /> : <FaEnvelope />}
                </button>

                <button
                  type="button"
                  onClick={() => void onArchive(notification)}
                  title="Archivieren"
                  aria-label="Archivieren"
                  className="cursor-pointer p-1 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
                >
                  <FaArchive />
                </button>
              </>
            )}

            {tab === OnSiteNotificationTab.Archive && (
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
      </div>
    </li>
  );
};
