"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import {
  restoreDocumentTitleUnreadCount,
  setDocumentTitleUnreadCount,
} from "@/modules/common/utils/title";
import { useChannelsContext } from "@/modules/pusher/components/ChannelsContext";
import { api } from "@/trpc/react";
import {
  getCitizenChannelName,
  ON_SITE_NOTIFICATION_CREATED_EVENT,
  OnSiteNotificationTab,
} from "@sam-monorepo/domain";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import * as z from "zod/mini";
import type { OnSiteNotificationRow } from "../utils/types";

const realtimeNotificationSchema = z.object({
  id: z.cuid2(),
  notificationType: z.string(),
  payload: z.unknown(),
  payloadVersion: z.number(),
  createdAt: z.coerce.date(),
  readAt: z.null(),
  archivedAt: z.null(),
});

/** Sets the count at once, then fetches it from the server */
const updateUnreadCount = (
  utils: ReturnType<typeof api.useUtils>,
  updateCount: (count: number) => number,
) => {
  utils.onSiteNotifications.unreadCount.setData(undefined, (count) =>
    count === undefined ? count : Math.max(0, updateCount(count)),
  );
  void utils.onSiteNotifications.unreadCount.invalidate();
};

interface OnSiteNotificationsContext {
  readonly unreadCount: number;
  /**
   * Sets the count at once after a change of the read state, and then
   * fetches it from the server: the server count wins, thus the bell does
   * not drift.
   */
  readonly setUnreadCount: (count: number) => void;
  /** Like `setUnreadCount()`, relative to the current count */
  readonly adjustUnreadCount: (delta: number) => void;
}

const OnSiteNotificationsContext = createContext<
  OnSiteNotificationsContext | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
  /** The count of the server render, until the first fetch of the count */
  readonly initialUnreadCount: number;
}

/**
 * Holds the unread count of on-site notifications in the TanStack cache,
 * next to the notification lists, mirrors it into the document title, and
 * subscribes to the citizen's soketi channel to receive new notifications in
 * realtime. Without a connected websocket client the count changes only with
 * the own changes of the read state.
 */
export const OnSiteNotificationsProvider = ({
  children,
  initialUnreadCount,
}: Props) => {
  const { data: unreadCount } = api.onSiteNotifications.unreadCount.useQuery(
    undefined,
    {
      initialData: initialUnreadCount,
      // Each change of the count fetches it again (see `setUnreadCount`)
      staleTime: Infinity,
    },
  );

  const authentication = useAuthentication();
  const entityId = authentication ? authentication.session.entity?.id : null;

  const { client } = useChannelsContext();
  const utils = api.useUtils();

  const setUnreadCount = (count: number) => {
    updateUnreadCount(utils, () => count);
  };

  const adjustUnreadCount = (delta: number) => {
    updateUnreadCount(utils, (count) => count + delta);
  };

  /**
   * Mirror the unread count into the document title. The MutationObserver
   * re-applies it after Next.js rewrites the title on navigation. It observes
   * the head, because a `refresh()` replaces the title element.
   */
  useEffect(() => {
    setDocumentTitleUnreadCount(unreadCount);

    const observer = new MutationObserver(() => {
      restoreDocumentTitleUnreadCount(unreadCount);
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [unreadCount]);

  useEffect(() => {
    if (!client || !entityId) return;

    const channelName = getCitizenChannelName(entityId);
    const channel = client.subscribe(channelName);

    channel.bind(ON_SITE_NOTIFICATION_CREATED_EVENT, (data: unknown) => {
      const result = realtimeNotificationSchema.safeParse(data);
      if (!result.success) return;

      const notification: OnSiteNotificationRow = {
        ...result.data,
        payload: result.data.payload as OnSiteNotificationRow["payload"],
        citizenId: entityId,
      };

      updateUnreadCount(utils, (count) => count + 1);

      /**
       * Prepend into the inbox list only when it has been fetched before;
       * an untouched cache would otherwise be primed with a single row and
       * the popover's first open would skip the full initial fetch.
       */
      const existingData = utils.onSiteNotifications.list.getInfiniteData({
        tab: OnSiteNotificationTab.Inbox,
      });
      if (!existingData) return;

      utils.onSiteNotifications.list.setInfiniteData(
        { tab: OnSiteNotificationTab.Inbox },
        (oldData) => {
          if (!oldData) return oldData;

          const alreadyListed = oldData.pages.some((page) =>
            page.items.some((item) => item.id === notification.id),
          );
          if (alreadyListed) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page, pageIndex) =>
              pageIndex === 0
                ? { ...page, items: [notification, ...page.items] }
                : page,
            ),
          };
        },
      );
    });

    return () => {
      channel.unbind(ON_SITE_NOTIFICATION_CREATED_EVENT);
      client.unsubscribe(channelName);
    };
  }, [client, entityId, utils]);

  const value = {
    unreadCount,
    setUnreadCount,
    adjustUnreadCount,
  };

  return (
    <OnSiteNotificationsContext value={value}>
      {children}
    </OnSiteNotificationsContext>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useOnSiteNotifications() {
  const context = useContext(OnSiteNotificationsContext);
  if (!context)
    throw new Error("[OnSiteNotificationsContext] Provider is missing!");
  return context;
}
