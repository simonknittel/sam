"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { api } from "@/trpc/react";
import { useCallback } from "react";
import { archiveOnSiteNotification } from "../actions/archiveOnSiteNotification";
import { archiveReadOnSiteNotifications } from "../actions/archiveReadOnSiteNotifications";
import { markAllOnSiteNotificationsRead } from "../actions/markAllOnSiteNotificationsRead";
import { markOnSiteNotificationsRead } from "../actions/markOnSiteNotificationsRead";
import { markOnSiteNotificationUnread } from "../actions/markOnSiteNotificationUnread";
import { unarchiveOnSiteNotification } from "../actions/unarchiveOnSiteNotification";
import { useOnSiteNotifications } from "../components/OnSiteNotificationsProvider";
import {
  NotificationCenterTab,
  type OnSiteNotificationRow,
} from "../utils/types";

/**
 * The state-changing operations of the notification center. Each runs its
 * server action and mirrors the result into the TanStack cache and the
 * unread count, so the UI updates without refetching. Lists the row moved
 * out of (other tab) are invalidated instead and refetch on their next use.
 */
export const useOnSiteNotificationMutations = () => {
  const utils = api.useUtils();
  const { setUnreadCount, adjustUnreadCount } = useOnSiteNotifications();

  const updateListItems = useCallback(
    (
      tab: NotificationCenterTab,
      updateItem: (item: OnSiteNotificationRow) => OnSiteNotificationRow | null,
    ) => {
      utils.onSiteNotifications.list.setInfiniteData({ tab }, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items
              .map(updateItem)
              .filter((item): item is OnSiteNotificationRow => item !== null),
          })),
        };
      });
    },
    [utils],
  );

  /**
   * Marks the given (unread, unarchived) notifications as read. Runs
   * silently — used by the read-on-view tracking and target navigation.
   */
  const markRead = useCallback(
    async (notificationIds: string[]) => {
      if (notificationIds.length <= 0) return;

      const formData = new FormData();
      for (const notificationId of notificationIds) {
        formData.append("notificationId", notificationId);
      }

      const succeeded = await runAction(markOnSiteNotificationsRead, formData, {
        successToast: false,
      });
      if (!succeeded) return;

      updateListItems(NotificationCenterTab.Inbox, (item) =>
        notificationIds.includes(item.id) && !item.readAt
          ? { ...item, readAt: new Date() }
          : item,
      );
      adjustUnreadCount(-notificationIds.length);
    },
    [updateListItems, adjustUnreadCount],
  );

  const markUnread = useCallback(
    async (notification: OnSiteNotificationRow) => {
      const formData = new FormData();
      formData.set("notificationId", notification.id);

      const succeeded = await runAction(markOnSiteNotificationUnread, formData);
      if (!succeeded) return;

      updateListItems(NotificationCenterTab.Inbox, (item) =>
        item.id === notification.id ? { ...item, readAt: null } : item,
      );
      adjustUnreadCount(1);
    },
    [updateListItems, adjustUnreadCount],
  );

  const archive = useCallback(
    async (notification: OnSiteNotificationRow) => {
      const formData = new FormData();
      formData.set("notificationId", notification.id);

      const succeeded = await runAction(archiveOnSiteNotification, formData);
      if (!succeeded) return;

      updateListItems(NotificationCenterTab.Inbox, (item) =>
        item.id === notification.id ? null : item,
      );
      if (!notification.readAt) adjustUnreadCount(-1);
      await utils.onSiteNotifications.list.invalidate({
        tab: NotificationCenterTab.Archive,
      });
    },
    [updateListItems, adjustUnreadCount, utils],
  );

  const unarchive = useCallback(
    async (notification: OnSiteNotificationRow) => {
      const formData = new FormData();
      formData.set("notificationId", notification.id);

      const succeeded = await runAction(unarchiveOnSiteNotification, formData);
      if (!succeeded) return;

      updateListItems(NotificationCenterTab.Archive, (item) =>
        item.id === notification.id ? null : item,
      );
      if (!notification.readAt) adjustUnreadCount(1);
      await utils.onSiteNotifications.list.invalidate({
        tab: NotificationCenterTab.Inbox,
      });
    },
    [updateListItems, adjustUnreadCount, utils],
  );

  const markAllRead = useCallback(async () => {
    const succeeded = await runAction(
      markAllOnSiteNotificationsRead,
      new FormData(),
    );
    if (!succeeded) return;

    updateListItems(NotificationCenterTab.Inbox, (item) =>
      item.readAt ? item : { ...item, readAt: new Date() },
    );
    setUnreadCount(0);
  }, [updateListItems, setUnreadCount]);

  const archiveAllRead = useCallback(async () => {
    const succeeded = await runAction(
      archiveReadOnSiteNotifications,
      new FormData(),
    );
    if (!succeeded) return;

    updateListItems(NotificationCenterTab.Inbox, (item) =>
      item.readAt ? null : item,
    );
    await utils.onSiteNotifications.list.invalidate({
      tab: NotificationCenterTab.Archive,
    });
  }, [updateListItems, utils]);

  return {
    markRead,
    markUnread,
    archive,
    unarchive,
    markAllRead,
    archiveAllRead,
  };
};
