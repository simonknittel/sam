import type { ActionSuccess } from "@/modules/actions/utils/createAction";

/** The success of a read of items, see `useRefetchOnSiteNotifications()` */
export interface MarkAsReadResponse extends ActionSuccess {
  /**
   * Whether the read marked notifications as read which announced the items.
   * The client then fetches the unread count of the bell again.
   */
  readonly notificationsRead: boolean;
}
