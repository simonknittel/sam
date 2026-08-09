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
} from "@sam-monorepo/notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import {
  NotificationCenterTab,
  type OnSiteNotificationRow,
} from "../utils/types";

const realtimeNotificationSchema = z.object({
  id: z.cuid2(),
  notificationType: z.string(),
  payload: z.unknown(),
  payloadVersion: z.number(),
  createdAt: z.coerce.date(),
  readAt: z.null(),
  archivedAt: z.null(),
});

interface OnSiteNotificationsContext {
  readonly unreadCount: number;
  readonly setUnreadCount: (count: number) => void;
  readonly adjustUnreadCount: (delta: number) => void;
}

const OnSiteNotificationsContext = createContext<
  OnSiteNotificationsContext | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly initialUnreadCount: number;
}

/**
 * Holds the unread count of on-site notifications (server-rendered initial
 * value), mirrors it into the document title, and subscribes to the
 * citizen's soketi channel to receive new notifications in realtime. Without
 * a connected websocket client this degrades to the initial page load state.
 */
export const OnSiteNotificationsProvider = ({
  children,
  initialUnreadCount,
}: Props) => {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const unreadCountRef = useRef(unreadCount);
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const authentication = useAuthentication();
  const entityId = authentication ? authentication.session.entity?.id : null;

  const { client } = useChannelsContext();
  const utils = api.useUtils();

  const adjustUnreadCount = useCallback((delta: number) => {
    setUnreadCount((count) => Math.max(0, count + delta));
  }, []);

  /**
   * Mirror the unread count into the document title. The MutationObserver
   * re-applies it after Next.js rewrites the title on navigation.
   */
  useEffect(() => {
    setDocumentTitleUnreadCount(unreadCount);

    const titleElement = document.querySelector("title");
    if (!titleElement) return;

    const observer = new MutationObserver(() => {
      restoreDocumentTitleUnreadCount(unreadCountRef.current);
    });
    observer.observe(titleElement, { childList: true });

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

      setUnreadCount((count) => count + 1);

      /**
       * Prepend into the inbox list only when it has been fetched before;
       * an untouched cache would otherwise be primed with a single row and
       * the popover's first open would skip the full initial fetch.
       */
      const existingData = utils.onSiteNotifications.list.getInfiniteData({
        tab: NotificationCenterTab.Inbox,
      });
      if (!existingData) return;

      utils.onSiteNotifications.list.setInfiniteData(
        { tab: NotificationCenterTab.Inbox },
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

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      adjustUnreadCount,
    }),
    [unreadCount, adjustUnreadCount],
  );

  return (
    <OnSiteNotificationsContext.Provider value={value}>
      {children}
    </OnSiteNotificationsContext.Provider>
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
