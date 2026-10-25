"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { api } from "@/trpc/react";
import { OnSiteNotificationTab } from "@sam-monorepo/domain";
import { useRouter } from "next/navigation";
import { archiveOnSiteNotification } from "../actions/archiveOnSiteNotification";
import { archiveReadOnSiteNotifications } from "../actions/archiveReadOnSiteNotifications";
import { markAllOnSiteNotificationsRead } from "../actions/markAllOnSiteNotificationsRead";
import { markOnSiteNotificationRead } from "../actions/markOnSiteNotificationRead";
import { markOnSiteNotificationUnread } from "../actions/markOnSiteNotificationUnread";
import { unarchiveOnSiteNotification } from "../actions/unarchiveOnSiteNotification";
import { useOnSiteNotifications } from "../components/OnSiteNotificationsProvider";
import type { OnSiteNotificationRow } from "../utils/types";

/**
 * The state-changing operations of the notification center. Each runs its
 * server action and mirrors the result into the TanStack cache, so the lists
 * update without refetching. Lists the row moved out of (other tab) are
 * invalidated instead and refetch on their next use. The unread count
 * changes at once and is then fetched from the server.
 */
export const useOnSiteNotificationMutations = () => {
  const utils = api.useUtils();
  const router = useRouter();
  const { setUnreadCount, adjustUnreadCount } = useOnSiteNotifications();

  const updateListItems = (
    tab: OnSiteNotificationTab,
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
  };

  /**
   * Marks an unread notification as read: from its toggle, or silently from
   * a click on its target
   */
  const markRead = async (
    notification: OnSiteNotificationRow,
    options?: { readonly successToast?: boolean },
  ) => {
    const formData = new FormData();
    formData.set("notificationId", notification.id);

    const response = await runAction(markOnSiteNotificationRead, formData, {
      successToast: options?.successToast,
    });
    if (!response) return;

    /**
     * The announced item lost its "new" state in the lists, tiles and dot
     * badges. After a click on the target, the router refreshes the new page.
     */
    if (response.newItemRead) router.refresh();

    const tab = notification.archivedAt
      ? OnSiteNotificationTab.Archive
      : OnSiteNotificationTab.Inbox;
    updateListItems(tab, (item) =>
      item.id === notification.id ? { ...item, readAt: new Date() } : item,
    );
    if (!notification.archivedAt) adjustUnreadCount(-1);
  };

  const markUnread = async (notification: OnSiteNotificationRow) => {
    const formData = new FormData();
    formData.set("notificationId", notification.id);

    const succeeded = await runAction(markOnSiteNotificationUnread, formData);
    if (!succeeded) return;

    updateListItems(OnSiteNotificationTab.Inbox, (item) =>
      item.id === notification.id ? { ...item, readAt: null } : item,
    );
    adjustUnreadCount(1);
  };

  const archive = async (notification: OnSiteNotificationRow) => {
    const formData = new FormData();
    formData.set("notificationId", notification.id);

    const succeeded = await runAction(archiveOnSiteNotification, formData);
    if (!succeeded) return;

    updateListItems(OnSiteNotificationTab.Inbox, (item) =>
      item.id === notification.id ? null : item,
    );
    if (!notification.readAt) adjustUnreadCount(-1);
    await utils.onSiteNotifications.list.invalidate({
      tab: OnSiteNotificationTab.Archive,
    });
  };

  const unarchive = async (notification: OnSiteNotificationRow) => {
    const formData = new FormData();
    formData.set("notificationId", notification.id);

    const succeeded = await runAction(unarchiveOnSiteNotification, formData);
    if (!succeeded) return;

    updateListItems(OnSiteNotificationTab.Archive, (item) =>
      item.id === notification.id ? null : item,
    );
    if (!notification.readAt) adjustUnreadCount(1);
    await utils.onSiteNotifications.list.invalidate({
      tab: OnSiteNotificationTab.Inbox,
    });
  };

  const markAllRead = async () => {
    const succeeded = await runAction(
      markAllOnSiteNotificationsRead,
      new FormData(),
    );
    if (!succeeded) return;

    updateListItems(OnSiteNotificationTab.Inbox, (item) =>
      item.readAt ? item : { ...item, readAt: new Date() },
    );
    setUnreadCount(0);
  };

  const archiveAllRead = async () => {
    const succeeded = await runAction(
      archiveReadOnSiteNotifications,
      new FormData(),
    );
    if (!succeeded) return;

    updateListItems(OnSiteNotificationTab.Inbox, (item) =>
      item.readAt ? null : item,
    );
    await utils.onSiteNotifications.list.invalidate({
      tab: OnSiteNotificationTab.Archive,
    });
  };

  return {
    markRead,
    markUnread,
    archive,
    unarchive,
    markAllRead,
    archiveAllRead,
  };
};
